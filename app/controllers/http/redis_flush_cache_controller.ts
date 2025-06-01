import type { HttpContext } from '@adonisjs/core/http'
import CacheService from '#services/cache_service'
import { getErrorMessage } from '#libs/error_utils'
import { HttpStatus } from '#constants/error_constants'

/**
 * DELETE /api/redis/flush → Flush all cache
 */
export default class RedisFlushCacheController {
  async handle({ response }: HttpContext) {
    try {
      await CacheService.flush()
      response.json({
        success: true,
        message: 'Cache flushed successfully',
      })
      return
    } catch (error: unknown) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to flush cache',
        error: getErrorMessage(error, 'Unknown error'),
      })
      return
    }
  }
}
