import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

/**
 * Middleware để debug CSRF token và thông tin session
 */
export default class CsrfDebugMiddleware {
  private isDevMode = env.get('NODE_ENV') === 'development'

  private log(...args: any[]) {
    if (this.isDevMode) {
      // Removed debug log: console.log(...args)
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    // Chỉ log trong môi trường development
    if (this.isDevMode) {
      // Lấy thông tin về request
      const requestToken = ctx.request.input('_csrf')
      const sessionToken = ctx.session.get('csrf-secret')
      const csrfHeader = ctx.request.header('x-csrf-token')

      // Removed all debug logs in this section
      // Log chọn lọc thay vì toàn bộ session data
      const sessionKeys = Object.keys(ctx.session.all())
      // Log cookie keys thay vì toàn bộ cookie data
      const cookieKeys = Object.keys(ctx.request.cookiesList())
    }

    return next()
  }
}
