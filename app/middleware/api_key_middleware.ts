import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'
import { timingSafeEqual } from 'node:crypto'

/**
 * Middleware kiểm tra API key cho các endpoint được bảo vệ như health check.
 *
 * FIX BẢO MẬT:
 * 1. Nếu HEALTH_CHECK_API_KEY chưa set → luôn chặn (secure by default)
 * 2. Dùng timing-safe comparison để chống timing attack
 */
export default class ApiKeyMiddleware {
  public async handle(ctx: HttpContext, next: NextFn) {
    const apiKey = ctx.request.header('x-api-key')
    const expectedApiKey = env.get('HEALTH_CHECK_API_KEY')

    // Secure by default: nếu chưa cấu hình API key → chặn
    if (!expectedApiKey) {
      ctx.response.serviceUnavailable({
        message: 'Health check API key chưa được cấu hình',
        error: 'service_unavailable',
        status: 503,
      })
      return
    }

    // Chặn nếu không gửi API key
    if (!apiKey) {
      ctx.response.unauthorized({
        message: 'API key không hợp lệ hoặc bị thiếu',
        error: 'unauthorized_access',
        status: 401,
      })
      return
    }

    // Timing-safe comparison để chống timing attack
    const apiKeyBuffer = Buffer.from(apiKey, 'utf8')
    const expectedBuffer = Buffer.from(expectedApiKey, 'utf8')

    if (
      apiKeyBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(apiKeyBuffer, expectedBuffer)
    ) {
      ctx.response.unauthorized({
        message: 'API key không hợp lệ hoặc bị thiếu',
        error: 'unauthorized_access',
        status: 401,
      })
      return
    }

    await next()
  }
}
