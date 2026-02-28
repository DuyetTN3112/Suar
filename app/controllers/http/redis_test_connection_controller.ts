import type { HttpContext } from '@adonisjs/core/http'
import Redis from '@adonisjs/redis/services/main'
import { getErrorMessage } from '#libs/error_utils'

/**
 * GET /api/redis/test → Test Redis connection
 */
export default class RedisTestConnectionController {
  async handle({ response }: HttpContext) {
    try {
      await Redis.ping()
      response.json({
        success: true,
        message: 'Redis connection successful',
      })
      return
    } catch (error: unknown) {
      response.status(500).json({
        success: false,
        message: 'Redis connection failed',
        error: getErrorMessage(error, 'Unknown error'),
      })
      return
    }
  }
}
