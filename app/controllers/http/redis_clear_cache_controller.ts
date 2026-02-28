import type { HttpContext } from '@adonisjs/core/http'
import CacheService from '#services/cache_service'
import { getErrorMessage } from '#libs/error_utils'
import { HttpStatus } from '#constants/error_constants'

/**
 * DELETE /api/redis/cache/:key → Clear specific cache key
 */
export default class RedisClearCacheController {
  async handle({ params, response }: HttpContext) {
    try {
      const key = params.key as string | undefined
      if (!key) {
        response.status(HttpStatus.BAD_REQUEST).json({
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
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to clear cache',
        error: getErrorMessage(error, 'Unknown error'),
      })
      return
    }
  }
}
