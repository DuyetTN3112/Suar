import type { HttpContext } from '@adonisjs/core/http'
import CacheService from '#services/cache_service'

/**
 * DELETE /api/redis/flush → Flush all cache
 */
export default class RedisFlushCacheController {
  async handle({ response }: HttpContext) {
    await CacheService.flush()
    response.json({
      success: true,
      message: 'Cache flushed successfully',
    })
  }
}
