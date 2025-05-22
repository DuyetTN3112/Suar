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
      console.log(...args)
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    // Chỉ log trong môi trường development
    if (this.isDevMode) {
      // Lấy thông tin về request
      const requestToken = ctx.request.input('_csrf')
      const sessionToken = ctx.session.get('csrf-secret')
      const csrfHeader = ctx.request.header('x-csrf-token')

      this.log('=== CSRF Debug ===')
      this.log('Request method:', ctx.request.method())
      this.log('Request path:', ctx.request.url(true))
      this.log('Request token from form:', requestToken)
      this.log('CSRF token from header:', csrfHeader)
      this.log('Session token (hashed):', sessionToken)
      // Log chọn lọc thay vì toàn bộ session data
      const sessionKeys = Object.keys(ctx.session.all())
      this.log('Session keys:', sessionKeys)
      // Log cookie keys thay vì toàn bộ cookie data
      const cookieKeys = Object.keys(ctx.request.cookiesList())
      this.log('Cookie keys:', cookieKeys)
    }

    return next()
  }
}
