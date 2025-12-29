// import { HttpContext } from '@adonisjs/core/http'
// import { NextFn } from '@adonisjs/core/types/http'
// import env from '#start/env'

/**
 * Middleware để debug CSRF token và thông tin session
 * Currently disabled - kept for future debugging purposes
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class CsrfDebugMiddleware {
  // private isDevMode = env.get('NODE_ENV') === 'development'
  // async handle(ctx: HttpContext, next: NextFn) {
  //   // Chỉ log trong môi trường development
  //   if (this.isDevMode) {
  //     // Lấy thông tin về request
  //     // Removed all debug logs in this section
  //     // Log chọn lọc thay vì toàn bộ session data
  //   }
  //   return next()
  // }
}
