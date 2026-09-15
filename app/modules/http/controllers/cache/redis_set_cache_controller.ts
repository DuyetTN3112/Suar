import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildSetCacheValueRequest } from '../mappers/request/cache/cache_admin_request_mapper.js'

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
    const input = buildSetCacheValueRequest(request.body())
    await this.actions
      .makeSetCacheValueCommand(actionContextFromHttp(ctx))
      .executeAndWrap(input)
      .then((outcome) => outcome.getValue())

    response.noContent()
  }
}
