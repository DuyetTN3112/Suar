import type { HttpContext } from '@adonisjs/core/http'
import CacheService from '#services/cache_service'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * DELETE /api/redis/cache/:key → Clear specific cache key
 */
export default class RedisClearCacheController {
  async handle({ params, response }: HttpContext) {
    const key = params.key as string | undefined
    if (!key) {
      throw new BusinessLogicException('Key is required')
    }
    await CacheService.delete(key)
    response.json({
      success: true,
      message: 'Cache cleared successfully',
      key,
    })
  }
}
