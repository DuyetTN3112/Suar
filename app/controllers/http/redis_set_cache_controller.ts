import type { HttpContext } from '@adonisjs/core/http'
import CacheService from '#services/cache_service'
import { getErrorMessage } from '#libs/error_utils'
import { HttpStatus } from '#constants/error_constants'

/**
 * POST /api/redis/cache → Set cache value
 */
export default class RedisSetCacheController {
  async handle({ request, response }: HttpContext) {
    try {
      const key = request.input('key') as string | undefined
      const value = request.input('value') as unknown
      const ttl = request.input('ttl', 3600) as number
      if (!key || value === undefined) {
        response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Key and value are required',
        })
        return
      }
      await CacheService.set(key, value, ttl)
      response.json({
        success: true,
        message: 'Cache set successfully',
        key,
        ttl,
      })
      return
    } catch (error: unknown) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to set cache',
        error: getErrorMessage(error, 'Unknown error'),
      })
      return
    }
  }
}
