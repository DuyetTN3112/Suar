import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { HttpCacheActionFactory } from '#modules/http/actions/ports/inbound/http_cache_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

/**
 * DELETE /api/redis/cache/:key → Clear specific cache key
 */
@inject()
export default class RedisClearCacheController {
  constructor(private readonly actions: HttpCacheActionFactory) {}

  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const key = params['key'] as string | undefined
    await this.actions.makeClearCacheKeyCommand(actionContextFromHttp(ctx)).execute(key ?? '')

    response.noContent()
  }
}
