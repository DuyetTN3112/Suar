import type { HttpContext } from '@adonisjs/core/http'
import CacheService from '#services/cache_service'
import { getErrorMessage } from '#libs/error_utils'
import { HttpStatus } from '#constants/error_constants'

/**
 * GET /api/redis/cache/:key → Get cache value
 */
export default class RedisGetCacheController {
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
      const value = await CacheService.get(key)
      if (value === null) {
        response.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'Key not found in cache',
          key,
        })
        return
      }
      response.json({
        success: true,
        key,
        value,
      })
      return
    } catch (error: unknown) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get cache',
        error: getErrorMessage(error, 'Unknown error'),
      })
      return
    }
  }
}
