import type { HttpContext } from '@adonisjs/core/http'

import { ClearCacheKeyCommand } from '#actions/http/cache/public_api'
import { ExecutionContext } from '#types/execution_context'

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
