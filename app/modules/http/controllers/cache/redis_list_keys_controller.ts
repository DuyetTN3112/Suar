import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildRedisListKeysRequest } from '../mappers/request/cache/redis_list_keys_request_mapper.js'

import { HttpCacheActionFactory } from '#modules/http/actions/ports/inbound/http_cache_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

/**
 * GET /api/redis/keys → List all Redis keys
 */
@inject()
export default class RedisListKeysController {
  constructor(private readonly actions: HttpCacheActionFactory) {}

  async handle(ctx: HttpContext) {
    const result = await this.actions
      .makeListCacheKeysQuery(actionContextFromHttp(ctx))
      .executeAndWrap(buildRedisListKeysRequest(ctx.request))
      .then((outcome) => outcome.getValue())

    return {
      data: result.keys,
      meta: {
        cursor: result.cursor,
        nextCursor: result.nextCursor,
        hasMore: result.nextCursor !== '0',
        count: result.count,
      },
    }
  }
}
