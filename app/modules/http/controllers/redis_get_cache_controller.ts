import type { HttpContext } from '@adonisjs/core/http'

import { GetCacheValueQuery } from '#modules/http/actions/cache/public_api'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'


/**
 * GET /api/redis/cache/:key → Get cache value
 */
export default class RedisGetCacheController {
  async handle(ctx: HttpContext) {
    const { params } = ctx
    const key = params['key'] as string | undefined
    const value = await new GetCacheValueQuery(actionContextFromHttp(ctx)).execute(key ?? '')

    return {
      data: {
        key,
        value,
      },
    }
  }
}
