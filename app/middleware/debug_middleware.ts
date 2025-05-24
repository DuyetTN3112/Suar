import type { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

/**
 * Middleware để debug thông tin request
 */
export default class DebugMiddleware {
  private isDevMode = env.get('NODE_ENV') === 'development'

  private log(...args: any[]) {
    if (this.isDevMode) {
      // Removed debug log: console.log(...args)
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    if (this.isDevMode) {
      // Removed all debug logs in this section
      // Log tổng quan các header thay vì chi tiết
      const headerKeys = Object.keys(ctx.request.headers())
      // Log cookie keys thay vì toàn bộ cookie
      const cookieKeys = Object.keys(ctx.request.cookiesList())
      // Log session keys thay vì toàn bộ session
      const sessionKeys = Object.keys(ctx.session.all())
      if (ctx.auth) {
        if (ctx.auth.isAuthenticated && ctx.auth.user) {
          // Removed user info log
        }
      } else {
        // Removed auth status log
      }
    }

    return next()
  }
}
