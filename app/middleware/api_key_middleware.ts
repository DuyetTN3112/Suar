import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

/**
 * Middleware kiểm tra API key cho các endpoint được bảo vệ như health check
 */
export default class ApiKeyMiddleware {
  /**
   * Xử lý request và kiểm tra API key
   */
  public async handle(ctx: HttpContext, next: NextFn) {
    const apiKey = ctx.request.header('x-api-key')
    const expectedApiKey = env.get('HEALTH_CHECK_API_KEY')

    if (apiKey !== expectedApiKey) {
      return ctx.response.unauthorized({
        message: 'API key không hợp lệ hoặc bị thiếu',
        error: 'unauthorized_access',
        status: 401,
      })
    }

    await next()
  }
}
