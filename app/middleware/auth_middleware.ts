import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import loggerService from '#services/logger_service'

/**
 * Auth Middleware — Xác thực + Batch preload relationships
 *
 * TRÁCH NHIỆM DUY NHẤT:
 *   1. Authenticate user (redirect nếu chưa login)
 *   2. Batch load relationships (system_role, organizations) — 1 query
 *   3. KHÔNG share Inertia data — config/inertia.ts xử lý
 *
 * THIẾT KẾ:
 *   - auth_middleware: Authenticate + preload (runs first via named middleware)
 *   - config/inertia.ts: Serialize preloaded data → share to frontend
 *   - Tránh double DB queries: inertia dùng $preloaded check
 *
 * UUID-READY: Dùng DatabaseId (string | number) cho tất cả IDs
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

        // Batch load: 1 call, 2 relationships — avoids N+1
        // config/inertia.ts sẽ check $preloaded trước khi load lại
        await user.load((loader) => {
          loader.load('system_role').load('organizations')
        })
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
