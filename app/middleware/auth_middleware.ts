import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import loggerService from '#services/logger_service'

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
    try {
      await ctx.auth.authenticateUsing(options.guards || ['web'], {
        loginRoute: this.redirectTo,
      })

      if (ctx.auth.user) {
        const user = ctx.auth.user

        // v3: system_role is inline on user — only preload organizations
        await user.load('organizations')
      }

      await next()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      loggerService.error('Lỗi xác thực', { error: errorMessage })

      ctx.session.put('intended_url', ctx.request.url())
      ctx.session.flash('authError', {
        timestamp: new Date().toISOString(),
        attemptedUrl: ctx.request.url(),
      })

      if (ctx.request.header('x-inertia')) {
        await ctx.inertia.location(this.redirectTo)
        return
      }

      ctx.response.redirect().toPath(this.redirectTo)
    }
  }
}
