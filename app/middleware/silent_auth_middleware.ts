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

  private log(...args: any[]) {
    if (this.isDevMode) {
      console.log(...args)
    }
  }

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    const startTime = this.isDevMode ? Date.now() : 0
    this.log('--- [SILENT AUTH MIDDLEWARE] ---')
    this.log('Request URL:', ctx.request.url())
    try {
      // Kiểm tra xác thực nhưng không bắt buộc
      for (let guard of options.guards || [ctx.auth.defaultGuard]) {
        await ctx.auth.use(guard).check()
      }
      if (this.isDevMode) {
        if (ctx.auth.isAuthenticated) {
          this.log('User is authenticated:', ctx.auth.user?.id)
        } else {
          this.log('User is not authenticated')
        }
      }
    } catch (error) {
      this.log('Silent auth check error:', error.message)
    } finally {
      if (this.isDevMode) {
        this.log('--- [SILENT AUTH MIDDLEWARE END] --- Duration:', Date.now() - startTime, 'ms')
      }
    }

    return next()
  }
}
