import { HttpContext } from '@adonisjs/core/http'
import redis from '@adonisjs/redis/services/main'

export default class RedisTestController {
  public async testConnection({ response }: HttpContext) {
    try {
      // Test basic Redis operations
      await redis.set('test_key', 'Hello Redis!')
      const value = await redis.get('test_key')
      return response.json({
        success: true,
        message: 'Redis connection successful',
        testValue: value,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Redis connection failed',
        error: error.message,
      })
    }
  }
}
