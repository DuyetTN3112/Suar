import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
// import env from '#start/env'

/**
 * Middleware cho người dùng chưa đăng nhập (khách)
 * Sử dụng middleware này cho các route như login, register
 * để chuyển hướng người dùng đã đăng nhập về tasks
 */
export default class GuestMiddleware {
  redirectTo = '/tasks'
  // private isDevMode = env.get('NODE_ENV') === 'development'

  // private log(...args: any[]) {
  //   if (this.isDevMode) {
  //     // Removed debug log: console.log(...args)
  //   }
  // }

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    // Removed all debug logs in this section
    // Kiểm tra người dùng đã đăng nhập chưa, nếu rồi thì chuyển hướng
    for (let guard of options.guards || [ctx.auth.defaultGuard]) {
      if (await ctx.auth.use(guard).check()) {
        if (ctx.request.header('x-inertia')) {
          return ctx.inertia.location(this.redirectTo)
        }
        return ctx.response.redirect(this.redirectTo)
      }
    }

    return next()
  }
}
