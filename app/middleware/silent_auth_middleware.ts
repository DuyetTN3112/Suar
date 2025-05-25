import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import env from '#start/env'

/**
 * Middleware kiểm tra xác thực người dùng nhưng không redirect nếu chưa đăng nhập
 * Cho phép page hiển thị với tình trạng đăng nhập hiện tại của người dùng
 */
export default class SilentAuthMiddleware {
  private isDevMode = env.get('NODE_ENV') === 'development'

  private log(..._args: unknown[]) {
    if (this.isDevMode) {
    }
  }

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    // const startTime = this.isDevMode ? Date.now() : 0
    try {
      // Kiểm tra xác thực nhưng không bắt buộc
      for (let guard of options.guards || [ctx.auth.defaultGuard]) {
        await ctx.auth.use(guard).check()
      }
      if (this.isDevMode) {
        if (ctx.auth.isAuthenticated) {
        } else {
        }
      }
    } catch (error) {
      // Keep error logging for actual errors
      this.log('Silent auth check error:', error.message)
    } finally {
      if (this.isDevMode) {
        // Removed debug log: this.log('--- [SILENT AUTH MIDDLEWARE END] --- Duration:', Date.now() - startTime, 'ms')
      }
    }

    return next()
  }
}
