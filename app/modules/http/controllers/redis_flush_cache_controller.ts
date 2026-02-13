import type { HttpContext } from '@adonisjs/core/http'

import { FlushCacheCommand } from '#modules/http/actions/cache/public_api'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'


/**
 * DELETE /api/redis/flush → Flush all cache
 */
export default class RedisFlushCacheController {
  async handle(ctx: HttpContext) {
    const { response } = ctx
    await new FlushCacheCommand(actionContextFromHttp(ctx)).execute()

    response.json({
      success: true,
      message: 'Cache flushed successfully',
    })
  }
}
