import type { HttpContext } from '@adonisjs/core/http'

import { FlushCacheCommand } from '#modules/http/actions/cache/public_api'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'


/**
 * DELETE /api/redis/cache → Flush all cache
 */
export default class RedisFlushCacheController {
  async handle(ctx: HttpContext) {
    const { response } = ctx
    await new FlushCacheCommand(actionContextFromHttp(ctx)).execute()

    response.noContent()
  }
}
