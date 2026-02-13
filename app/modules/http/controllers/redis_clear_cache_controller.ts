import type { HttpContext } from '@adonisjs/core/http'

import { ClearCacheKeyCommand } from '#modules/http/actions/cache/public_api'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'


/**
 * DELETE /api/redis/cache/:key → Clear specific cache key
 */
export default class RedisClearCacheController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const key = params.key as string | undefined
    await new ClearCacheKeyCommand(actionContextFromHttp(ctx)).execute(key ?? '')

    response.json({
      success: true,
      message: 'Cache cleared successfully',
      key,
    })
  }
}
