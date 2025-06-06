import type { HttpContext } from '@adonisjs/core/http'
import CacheService from '#services/cache_service'
import BusinessLogicException from '#exceptions/business_logic_exception'
import NotFoundException from '#exceptions/not_found_exception'

/**
 * GET /api/redis/cache/:key → Get cache value
 */
export default class RedisGetCacheController {
  async handle({ params, response }: HttpContext) {
    const key = params.key as string | undefined
    if (!key) {
      throw new BusinessLogicException('Key is required')
    }
    const value = await CacheService.get(key)
    if (value === null) {
      throw new NotFoundException('Cache key not found')
    }
    response.json({
      success: true,
      key,
      value,
    })
  }
}
