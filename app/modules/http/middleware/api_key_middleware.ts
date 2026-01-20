import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { enforceOperationsApiKey } from './operations_api_key_guard.js'

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
    await enforceOperationsApiKey(
      ctx,
      next,
      env.get('HEALTH_CHECK_API_KEY'),
      'Health check API key chưa được cấu hình'
    )
  }
}
