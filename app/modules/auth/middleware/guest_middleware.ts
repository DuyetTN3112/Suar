import type { Authenticators } from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
/**
 * Middleware cho người dùng chưa đăng nhập (khách)
 * Sử dụng middleware này cho các route như login, register
 * để chuyển hướng người dùng đã đăng nhập về tasks
 */
export default class GuestMiddleware {
  redirectTo = '/tasks'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ): Promise<void> {
    // Removed all debug logs in this section
    // Kiểm tra người dùng đã đăng nhập chưa, nếu rồi thì chuyển hướng
    for (const guard of options.guards ?? [ctx.auth.defaultGuard]) {
      if (await ctx.auth.use(guard).check()) {
        if (ctx.request.header('x-inertia')) {
          ctx.inertia.location(this.redirectTo)
          return
        }
        ctx.response.redirect(this.redirectTo)
        return
      }
    }

    await next()
  }
}
