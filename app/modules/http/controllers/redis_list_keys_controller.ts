import type { HttpContext } from '@adonisjs/core/http'
import Redis from '@adonisjs/redis/services/main'

/**
 * GET /api/redis/keys → List all Redis keys
 */
export default class RedisListKeysController {
  async handle({ request }: HttpContext) {
    const pattern = request.input('pattern', '*') as string
    const keys = await Redis.keys(pattern)

    return {
      data: keys,
    }
  }
}
