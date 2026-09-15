import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildCacheKeyRequest } from '../mappers/request/cache/cache_admin_request_mapper.js'

import { HttpCacheActionFactory } from '#modules/http/actions/ports/inbound/http_cache_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

/**
 * DELETE /api/redis/cache/:key → Clear specific cache key
 */
@inject()
export default class RedisClearCacheController {
  constructor(private readonly actions: HttpCacheActionFactory) {}

  async handle(ctx: HttpContext) {
    const { response } = ctx
    const { key } = buildCacheKeyRequest(ctx.params)
    await this.actions
      .makeClearCacheKeyCommand(actionContextFromHttp(ctx))
      .executeAndWrap(key)
      .then((outcome) => outcome.getValue())

    response.noContent()
  }
}
