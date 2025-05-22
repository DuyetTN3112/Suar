import { HttpContext } from '@adonisjs/core/http'
import Redis from '@adonisjs/redis/services/main'
import CacheService from '#services/cache_service'

/**
 * Controller để kiểm tra và quản lý Redis cache
 */
export default class RedisController {
  /**
   * Kiểm tra kết nối Redis
   */
  async testConnection({ response }: HttpContext) {
    try {
      await Redis.ping()
      return response.json({
        success: true,
        message: 'Redis connection successful',
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Redis connection failed',
        error: error.message,
      })
    }
  }

  /**
   * Liệt kê tất cả các key trong Redis
   */
  async listKeys({ response, request }: HttpContext) {
    try {
      const pattern = request.input('pattern', '*')
      const keys = await Redis.keys(pattern)
      return response.json({
        success: true,
        count: keys.length,
        keys,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Failed to list Redis keys',
        error: error.message,
      })
    }
  }

  /**
   * Đặt giá trị vào cache
   */
  async setCache({ request, response }: HttpContext) {
    try {
      const key = request.input('key')
      const value = request.input('value')
      const ttl = request.input('ttl', 3600)
      if (!key || value === undefined) {
        return response.status(400).json({
          success: false,
          message: 'Key and value are required',
        })
      }
      await CacheService.set(key, value, ttl)
      return response.json({
        success: true,
        message: 'Cache set successfully',
        key,
        ttl,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Failed to set cache',
        error: error.message,
      })
    }
  }

  /**
   * Lấy giá trị từ cache
   */
  async getCache({ params, response }: HttpContext) {
    try {
      const key = params.key
      if (!key) {
        return response.status(400).json({
          success: false,
          message: 'Key is required',
        })
      }
      const value = await CacheService.get(key)
      if (value === null) {
        return response.status(404).json({
          success: false,
          message: 'Key not found in cache',
          key,
        })
      }
      return response.json({
        success: true,
        key,
        value,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Failed to get cache',
        error: error.message,
      })
    }
  }

  /**
   * Xóa giá trị trong cache
   */
  async clearCache({ params, response }: HttpContext) {
    try {
      const key = params.key
      if (!key) {
        return response.status(400).json({
          success: false,
          message: 'Key is required',
        })
      }
      await CacheService.delete(key)
      return response.json({
        success: true,
        message: 'Cache cleared successfully',
        key,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Failed to clear cache',
        error: error.message,
      })
    }
  }

  /**
   * Xóa toàn bộ cache
   */
  async flushCache({ response }: HttpContext) {
    try {
      await CacheService.flush()
      return response.json({
        success: true,
        message: 'Cache flushed successfully',
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Failed to flush cache',
        error: error.message,
      })
    }
  }
}
