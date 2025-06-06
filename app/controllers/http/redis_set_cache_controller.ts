import type { HttpContext } from '@adonisjs/core/http'
import CacheService from '#services/cache_service'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * POST /api/redis/cache → Set cache value
 */
export default class RedisSetCacheController {
  async handle({ request, response }: HttpContext) {
    const key = request.input('key') as string | undefined
    const value = request.input('value') as unknown
    const ttl = request.input('ttl', 3600) as number
    if (!key || value === undefined) {
      throw new BusinessLogicException('Key and value are required')
    }
    await CacheService.set(key, value, ttl)
    response.json({
      success: true,
      message: 'Cache set successfully',
      key,
      ttl,
    })
  }
}
