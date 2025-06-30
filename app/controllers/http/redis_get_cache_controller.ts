import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetCacheValueQuery from '#actions/common/queries/get_cache_value_query'

/**
 * GET /api/redis/cache/:key → Get cache value
 */
export default class RedisGetCacheController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const key = params.key as string | undefined
    const value = await new GetCacheValueQuery(ExecutionContext.fromHttp(ctx)).execute(key ?? '')

    response.json({
      success: true,
      key,
      value,
    })
  }
}
