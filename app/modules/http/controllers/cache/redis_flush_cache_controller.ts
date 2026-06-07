import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { HttpCacheActionFactory } from '#modules/http/actions/ports/inbound/http_cache_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

/**
 * DELETE /api/redis/cache → Flush all cache
 */
@inject()
export default class RedisFlushCacheController {
  constructor(private readonly actions: HttpCacheActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const confirmation =
      request.header('x-confirm-cache-flush') ?? (request.input('confirm', '') as string)
    await this.actions
      .makeFlushCacheCommand(actionContextFromHttp(ctx))
      .executeAndWrap(confirmation)
      .then((outcome) => outcome.getValue())

    response.noContent()
  }
}
