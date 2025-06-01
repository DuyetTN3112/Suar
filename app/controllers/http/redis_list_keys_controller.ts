import type { HttpContext } from '@adonisjs/core/http'
import Redis from '@adonisjs/redis/services/main'
import { getErrorMessage } from '#libs/error_utils'
import { HttpStatus } from '#constants/error_constants'

/**
 * GET /api/redis/keys → List all Redis keys
 */
export default class RedisListKeysController {
  async handle({ response, request }: HttpContext) {
    try {
      const pattern = request.input('pattern', '*') as string
      const keys = await Redis.keys(pattern)
      response.json({
        success: true,
        count: keys.length,
        keys,
      })
      return
    } catch (error: unknown) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to list Redis keys',
        error: getErrorMessage(error, 'Unknown error'),
      })
      return
    }
  }
}
