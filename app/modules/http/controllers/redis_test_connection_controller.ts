import type { HttpContext } from '@adonisjs/core/http'
import Redis from '@adonisjs/redis/services/main'

/**
 * GET /api/redis/test → Test Redis connection
 */
export default class RedisTestConnectionController {
  async handle({ response }: HttpContext) {
    await Redis.ping()
    response.json({
      success: true,
      message: 'Redis connection successful',
    })
  }
}
