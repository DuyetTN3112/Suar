import type { HttpContext } from '@adonisjs/core/http'

import { GetCacheValueQuery } from '#modules/http/actions/cache/public_api'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'


/**
 * GET /api/redis/cache/:key → Get cache value
 */
export default class RedisGetCacheController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const key = params.key as string | undefined
    const value = await new GetCacheValueQuery(actionContextFromHttp(ctx)).execute(key ?? '')

    response.json({
      success: true,
      key,
      value,
    })
  }
}
