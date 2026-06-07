import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { HttpCacheActionFactory } from '#modules/http/actions/ports/inbound/http_cache_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

/**
 * POST /api/redis/cache → Set cache value
 */
@inject()
export default class RedisSetCacheController {
  constructor(private readonly actions: HttpCacheActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const key = request.input('key') as string | undefined
    const value = request.input('value') as unknown
    const ttl = request.input('ttl', 3600) as number
    await this.actions
      .makeSetCacheValueCommand(actionContextFromHttp(ctx))
      .executeAndWrap({ key: key ?? '', value, ttl })
      .then((outcome) => outcome.getValue())

    response.noContent()
  }
}
