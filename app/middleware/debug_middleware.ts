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
      console.log(...args)
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    if (this.isDevMode) {
      this.log('=== Request Debug ===')
      this.log('URL:', ctx.request.url())
      this.log('Method:', ctx.request.method())
      this.log('Query Params:', ctx.request.qs())

      // Log tổng quan các header thay vì chi tiết
      const headerKeys = Object.keys(ctx.request.headers())
      this.log(
        'Header keys:',
        headerKeys.length > 10
          ? [...headerKeys.slice(0, 10), `...and ${headerKeys.length - 10} more`]
          : headerKeys
      )

      // Log cookie keys thay vì toàn bộ cookie
      const cookieKeys = Object.keys(ctx.request.cookiesList())
      this.log('Cookie keys:', cookieKeys)

      // Log session keys thay vì toàn bộ session
      const sessionKeys = Object.keys(ctx.session.all())
      this.log('Session keys:', sessionKeys)
      if (ctx.auth) {
        this.log('Auth Status:', ctx.auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated')
        if (ctx.auth.isAuthenticated && ctx.auth.user) {
          this.log('User:', { id: ctx.auth.user.id, email: ctx.auth.user.email })
        }
      } else {
        this.log('Auth Status: Not Available')
      }
    }

    return next()
  }
}
