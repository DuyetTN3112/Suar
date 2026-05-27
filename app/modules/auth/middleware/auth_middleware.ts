import { errors as authErrors } from '@adonisjs/auth'
import type { Authenticators } from '@adonisjs/auth/types'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import {
  AuthWebSessionUserReader,
  type AuthWebSessionUser,
} from '#modules/auth/actions/ports/outbound/auth_web_session_user_reader'
import { VerifySessionAccessTokenQuery } from '#modules/auth/actions/queries/session-management/verify_session_access_token_query'
import type { ApiAuthContract } from '#modules/auth/boundary/api_auth_contract'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { classifyHttpTransport, isApiTransport } from '#modules/http/boundary/http_transport'
import loggerService from '#modules/logger/public_contracts/application_logger'

function isLogoutRequest(url: string): boolean {
  return url === '/logout'
}

/**
 * Auth Middleware — xác thực và bảo vệ trạng thái tài khoản
 *
 * TRÁCH NHIỆM DUY NHẤT:
 *   1. Authenticate user (redirect nếu chưa login)
 *   2. KHÔNG share Inertia data — config/inertia.ts xử lý
 *
 * v3: system_role là inline VARCHAR trên users table — không cần preload.
 */
@inject()
export default class AuthMiddleware {
  constructor(
    private readonly verifySessionAccessToken: VerifySessionAccessTokenQuery,
    private readonly webSessionUsers: AuthWebSessionUserReader
  ) {}

  public redirectTo = '/login'

  public async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ): Promise<void> {
    const transport = classifyHttpTransport(ctx)
    const authContract = this.resolveApiAuthContract(ctx, transport)
    let authenticated = false

    try {
      if (isApiTransport(transport) && authContract === 'bearer-or-session') {
        authenticated = await this.tryAuthenticateApiBearerToken(ctx)
      }

      if (!authenticated) {
        this.resetPoisonedSessionGuard(ctx)
        await ctx.auth.authenticateUsing(options.guards ?? ['web'], {
          loginRoute: this.redirectTo,
        })

        if (ctx.auth.user) {
          const user = ctx.auth.user

          if (!this.isActiveAccount(user) && !isLogoutRequest(ctx.request.url())) {
            throw new UnauthorizedException('User is no longer active')
          }
        }

        authenticated = true
      }
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) {
        throw error
      }
      const authenticationRejected =
        error instanceof authErrors.E_UNAUTHORIZED_ACCESS || error instanceof UnauthorizedException
      if (!authenticationRejected) {
        throw error
      }

      if (isApiTransport(transport) && authContract === 'session-or-bearer') {
        authenticated = await this.tryAuthenticateApiBearerToken(ctx)
      }

      if (isApiTransport(transport) && !authenticated) {
        authenticated = await this.tryAuthenticateApiSessionFallback(ctx)
      }

      if (isApiTransport(transport) && !authenticated) {
        throw error
      }

      if (!authenticated) {
        loggerService.warn('Authentication failed', {
          errorCode:
            error instanceof authErrors.E_UNAUTHORIZED_ACCESS
              ? authErrors.E_UNAUTHORIZED_ACCESS.code
              : UnauthorizedException.code,
          url: ctx.request.url(),
          requestId: ctx.requestContext.requestId,
          correlationId: ctx.requestContext.correlationId,
        })

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
        return
      }
    }

    // Downstream exceptions must never be interpreted as authentication
    // failures. Keeping next() outside the authentication catch also makes the
    // middleware's exactly-once execution guarantee explicit.
    await next()
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

    const verified = await this.verifySessionAccessToken.execute(accessToken)
    if (!verified || !this.isActiveAccount(verified.user)) {
      return false
    }

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

    const user = await this.webSessionUsers.findById(sessionUserId)
    if (!user || !this.isActiveAccount(user)) {
      return false
    }

    const webGuard = ctx.auth.use('web') as {
      authenticationAttempted: boolean
      isAuthenticated: boolean
      user?: AuthWebSessionUser
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

  private isActiveAccount(user: { status: string; deleted_at: unknown }): boolean {
    return user.status === 'active' && user.deleted_at === null
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
