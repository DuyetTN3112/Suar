import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export class AuthChain {
  public async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    if (!ctx.auth.user) {
      throw new Error('Unauthorized')
    }

    const user = ctx.auth.user
    if (user.status === 'suspended') {
      const request = (ctx as { request?: { method?: () => string } }).request
      const method =
        typeof request?.method === 'function' ? request.method() : 'POST'
      if (method !== 'GET') {
        throw new Error('User is suspended')
      }
    }

    await next()
  }
}
