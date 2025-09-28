import type { Authenticators } from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import type { ApiAuthContract } from '#modules/auth/boundary/api_auth_contract'
import { sessionTokenService } from '#modules/auth/services/session_token_service'
import {
  classifyHttpTransport,
  isApiTransport,
} from '#modules/http/boundary/http_transport'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { UserModel } from '#modules/users/public_contracts/user_model'


function isLogoutRequest(url: string): boolean {
  return url === '/logout'
}

/**
 * Auth Middleware — Xác thực + Batch preload relationships
 *
 * TRÁCH NHIỆM DUY NHẤT:
 *   1. Authenticate user (redirect nếu chưa login)
 *   2. Batch load relationships (organizations) — 1 query
 *   3. KHÔNG share Inertia data — config/inertia.ts xử lý
 *
 * v3: system_role là inline VARCHAR trên users table — không cần preload.
 * Chỉ preload organizations.
 */
export default class AuthMiddleware {
  public redirectTo = '/login'

  public async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ): Promise<void> {
    const transport = classifyHttpTransport(ctx)
    const authContract = this.resolveApiAuthContract(ctx, transport)

    try {
      if (isApiTransport(transport) && authContract === 'bearer-or-session') {
        const bearerAuthenticated = await this.tryAuthenticateApiBearerToken(ctx)
        if (bearerAuthenticated) {
          await next()
          return
        }
      }

      this.resetPoisonedSessionGuard(ctx)
      await ctx.auth.authenticateUsing(options.guards ?? ['web'], {
        loginRoute: this.redirectTo,
      })

      if (ctx.auth.user) {
        const user = ctx.auth.user

        const isDeleted = user.deleted_at !== null

        if ((user.status === 'suspended' || isDeleted) && !isLogoutRequest(ctx.request.url())) {
          const error = new Error('E_UNAUTHORIZED_ACCESS')
          Object.defineProperty(error, 'code', { value: 'E_UNAUTHORIZED_ACCESS' })
          Object.defineProperty(error, 'status', { value: 401 })
          throw error
        }

        // v3: system_role is inline on user — only preload organizations
        await user.load('organizations')
      }

      await next()
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) {
        throw error
      }

      if (isApiTransport(transport) && authContract === 'session-or-bearer') {
        const bearerAuthenticated = await this.tryAuthenticateApiBearerToken(ctx)
        if (bearerAuthenticated) {
          await next()
          return
        }
      }

      if (isApiTransport(transport)) {
        const sessionAuthenticated = await this.tryAuthenticateApiSessionFallback(ctx)
        if (sessionAuthenticated) {
          await next()
          return
        }
      }

      if (isApiTransport(transport)) {
        throw error
      }

      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('AuthMiddleware error:', error)
      loggerService.error('Lỗi xác thực', { error: errorMessage })

      ctx.session.put('intended_url', ctx.request.url())
      ctx.session.flash('authError', {
        timestamp: new Date().toISOString(),
        attemptedUrl: ctx.request.url(),
      })

      if (ctx.request.header('x-inertia')) {
        ctx.inertia.location(this.redirectTo)
        return
      }

      ctx.response.redirect().toPath(this.redirectTo)
    }
  }

  private resolveApiAuthContract(
    ctx: HttpContext,
    transport: ReturnType<typeof classifyHttpTransport>
  ): ApiAuthContract | null {
    if (!isApiTransport(transport)) {
      return null
    }

    return ctx.apiAuthContract ?? 'session-or-bearer'
  }

  private async tryAuthenticateApiBearerToken(ctx: HttpContext): Promise<boolean> {
    const authorizationHeader = ctx.request.header('authorization')
    if (!authorizationHeader?.startsWith('Bearer ')) {
      return false
    }

    const accessToken = authorizationHeader.slice('Bearer '.length).trim()
    if (!accessToken) {
      return false
    }

    const verified = await sessionTokenService.verifyAccessToken(accessToken)
    if (!verified) {
      return false
    }

    await verified.user.load('organizations')

    const webGuard = ctx.auth.use('web') as {
      authenticationAttempted: boolean
      isAuthenticated: boolean
      user?: typeof verified.user
    }

    webGuard.authenticationAttempted = true
    webGuard.isAuthenticated = true
    webGuard.user = verified.user

    await ctx.auth.authenticateUsing(['web'])

    if (verified.organizationId) {
      ctx.currentOrganizationId = verified.organizationId
    }

    return true
  }

  private async tryAuthenticateApiSessionFallback(ctx: HttpContext): Promise<boolean> {
    const sessionUserId = ctx.session.get('auth_web') as unknown
    if (typeof sessionUserId !== 'string' || sessionUserId.length === 0) {
      return false
    }

    const user = await UserModel.query().where('id', sessionUserId).first()
    if (!user) {
      return false
    }

    await user.load('organizations')

    const webGuard = ctx.auth.use('web') as {
      authenticationAttempted: boolean
      isAuthenticated: boolean
      user?: InstanceType<typeof UserModel>
    }

    webGuard.authenticationAttempted = true
    webGuard.isAuthenticated = true
    webGuard.user = user

    const sessionOrganizationId = ctx.session.get('current_organization_id') as unknown
    if (typeof sessionOrganizationId === 'string' && sessionOrganizationId.length > 0) {
      ctx.currentOrganizationId = sessionOrganizationId
    }

    return true
  }

  private resetPoisonedSessionGuard(ctx: HttpContext): void {
    const webGuard = ctx.auth.use('web') as {
      authenticationAttempted?: boolean
      isAuthenticated?: boolean
      user?: unknown
    }

    if (webGuard.authenticationAttempted && !webGuard.isAuthenticated) {
      webGuard.authenticationAttempted = false
      webGuard.user = undefined
    }
  }
}
