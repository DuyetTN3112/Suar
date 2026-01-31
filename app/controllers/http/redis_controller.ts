import type { HttpContext } from '@adonisjs/core/http'
import Redis from '@adonisjs/redis/services/main'
import CacheService from '#services/cache_service'
import { getErrorMessage } from '#libs/error_utils'

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

  /**
   * Liệt kê tất cả các key trong Redis
   */
  async listKeys({ response, request }: HttpContext) {
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
      response.status(500).json({
        success: false,
        message: 'Failed to list Redis keys',
        error: getErrorMessage(error, 'Unknown error'),
      })
      return
    }
  }

  /**
   * Đặt giá trị vào cache
   */
  async setCache({ request, response }: HttpContext) {
    try {
      const key = request.input('key') as string | undefined
      const value = request.input('value') as unknown
      const ttl = request.input('ttl', 3600) as number
      if (!key || value === undefined) {
        response.status(400).json({
          success: false,
          message: 'Key and value are required',
        })
        return
      }
      await CacheService.set(key, value, ttl)
      response.json({
        success: true,
        message: 'Cache set successfully',
        key,
        ttl,
      })
      return
    } catch (error: unknown) {
      response.status(500).json({
        success: false,
        message: 'Failed to set cache',
        error: getErrorMessage(error, 'Unknown error'),
      })
      return
    }
  }

  /**
   * Lấy giá trị từ cache
   */
  async getCache({ params, response }: HttpContext) {
    try {
      const key = params.key as string | undefined
      if (!key) {
        response.status(400).json({
          success: false,
          message: 'Key is required',
        })
        return
      }
      const value = await CacheService.get(key)
      if (value === null) {
        response.status(404).json({
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
      response.status(500).json({
        success: false,
        message: 'Failed to get cache',
        error: getErrorMessage(error, 'Unknown error'),
      })
      return
    }
  }

  /**
   * Xóa giá trị trong cache
   */
  async clearCache({ params, response }: HttpContext) {
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

  /**
   * Xóa toàn bộ cache
   */
  async flushCache({ response }: HttpContext) {
    try {
      await CacheService.flush()
      response.json({
        success: true,
        message: 'Cache flushed successfully',
      })
      return
    } catch (error: unknown) {
      response.status(500).json({
        success: false,
        message: 'Failed to flush cache',
        error: getErrorMessage(error, 'Unknown error'),
      })
      return
    }
  }
}
