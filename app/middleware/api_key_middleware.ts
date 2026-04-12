import { timingSafeEqual } from 'node:crypto'

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { HttpStatus } from '#constants/error_constants'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import env from '#start/env'

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
      ctx.response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        message: 'Health check API key chưa được cấu hình',
        error: 'service_unavailable',
      })
      return
    }

    // Chặn nếu không gửi API key
    if (!apiKey) {
      throw new UnauthorizedException('API key không hợp lệ hoặc bị thiếu')
    }

    // Timing-safe comparison để chống timing attack
    const apiKeyBuffer = Buffer.from(apiKey, 'utf8')
    const expectedBuffer = Buffer.from(expectedApiKey, 'utf8')

    if (
      apiKeyBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(apiKeyBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('API key không hợp lệ hoặc bị thiếu')
    }

    await next()
  }
}
