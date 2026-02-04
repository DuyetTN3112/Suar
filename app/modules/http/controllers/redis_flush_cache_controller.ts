import type { HttpContext } from '@adonisjs/core/http'

import { FlushCacheCommand } from '#actions/http/cache/public_api'
import { ExecutionContext } from '#types/execution_context'

/**
 * DELETE /api/redis/flush → Flush all cache
 */
export default class RedisFlushCacheController {
  async handle(ctx: HttpContext) {
    const { response } = ctx
    await new FlushCacheCommand(ExecutionContext.fromHttp(ctx)).execute()

    response.json({
      success: true,
      message: 'Cache flushed successfully',
    })
  }
}
