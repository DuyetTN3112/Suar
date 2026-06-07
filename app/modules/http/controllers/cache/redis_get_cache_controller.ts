import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { HttpCacheActionFactory } from '#modules/http/actions/ports/inbound/http_cache_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

/**
 * GET /api/redis/cache/:key → Get cache value
 */
@inject()
export default class RedisGetCacheController {
  constructor(private readonly actions: HttpCacheActionFactory) {}

  async handle(ctx: HttpContext) {
    const { params } = ctx
    const key = params['key'] as string | undefined
    const value = await this.actions
      .makeGetCacheValueQuery(actionContextFromHttp(ctx))
      .executeAndWrap(key ?? '')
      .then((outcome) => outcome.getValue())

    return {
      data: {
        key,
        value,
      },
    }
  }
}
