import type { HttpContext } from '@adonisjs/core/http'

import SetCacheValueCommand from '#actions/common/commands/set_cache_value_command'
import { ExecutionContext } from '#types/execution_context'

/**
 * POST /api/redis/cache → Set cache value
 */
export default class RedisSetCacheController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const key = request.input('key') as string | undefined
    const value = request.input('value') as unknown
    const ttl = request.input('ttl', 3600) as number
    await new SetCacheValueCommand(ExecutionContext.fromHttp(ctx)).execute({
      key: key ?? '',
      value,
      ttl,
    })

    response.json({
      success: true,
      message: 'Cache set successfully',
      key,
      ttl,
    })
  }
}
