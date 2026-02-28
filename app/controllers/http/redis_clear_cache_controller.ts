import type { HttpContext } from '@adonisjs/core/http'
import CacheService from '#services/cache_service'
import { getErrorMessage } from '#libs/error_utils'

/**
 * DELETE /api/redis/cache/:key → Clear specific cache key
 */
export default class RedisClearCacheController {
  async handle({ params, response }: HttpContext) {
    try {
      const key = params.key as string | undefined
      if (!key) {
        response.status(400).json({
          success: false,
          message: 'Key is required',
        })
        return
      }
      await CacheService.delete(key)
      response.json({
        success: true,
        message: 'Cache cleared successfully',
        key,
      })
      return
    } catch (error: unknown) {
      response.status(500).json({
        success: false,
        message: 'Failed to clear cache',
        error: getErrorMessage(error, 'Unknown error'),
      })
      return
    }
  }
}
