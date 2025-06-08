import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ClearCacheKeyCommand from '#actions/common/commands/clear_cache_key_command'

/**
 * DELETE /api/redis/cache/:key → Clear specific cache key
 */
export default class RedisClearCacheController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const key = params.key as string | undefined
    await new ClearCacheKeyCommand(ExecutionContext.fromHttp(ctx)).execute(key ?? '')

    response.json({
      success: true,
      message: 'Cache cleared successfully',
      key,
    })
  }
}
