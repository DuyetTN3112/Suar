import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

/**
 * Middleware để debug thông tin request
 */
export default class DebugMiddleware {
  private isDevMode = env.get('NODE_ENV') === 'development'

  // private log(...args: unknown[]) { /* unused */ }

  handle(ctx: HttpContext, next: NextFn): Promise<void> {
    if (this.isDevMode && ctx.auth?.isAuthenticated && ctx.auth.user) {
      // Removed all debug logs in this section
      // Log tổng quan các header thay vì chi tiết
      // const headerKeys = Object.keys(ctx.request.headers()) // unused
      // Log cookie keys thay vì toàn bộ cookie
      // const cookieKeys = Object.keys(ctx.request.cookiesList()) // unused
      // Log session keys thay vì toàn bộ session
      // const sessionKeys = Object.keys(ctx.session.all()) // unused
    }

    return next() as Promise<void>
  }
}
