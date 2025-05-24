import Redis from '@adonisjs/redis/services/main'
import SingleFlightService from '#services/single_flight_service'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class CacheMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { ttl?: number; prefix?: string } = {}) {
    const { request, response } = ctx
    const ttl = options.ttl || 3600 // Mặc định 1 giờ
    const prefix = options.prefix || 'cache'
    const cacheKey = `${prefix}:${request.method()}:${request.url()}`

    // Bỏ qua cache cho các phương thức không phải GET
    if (request.method() !== 'GET') {
      return next()
    }

    try {
      // Kiểm tra nếu dữ liệu đã được cache
      const cachedData = await Redis.get(cacheKey)
      if (cachedData) {
        // Trả về dữ liệu từ cache
        return response.header('X-Cache', 'HIT').json(JSON.parse(cachedData))
      }

      // Sử dụng Single Flight Pattern để ngăn chặn thundering herd
      // Tạo key duy nhất cho single flight pattern
      const singleFlightKey = `middleware:${cacheKey}`

      return SingleFlightService.execute(singleFlightKey, async () => {
        // Kiểm tra lại cache để đảm bảo không có request khác đã set cache trong khi chờ
        const recheckedData = await Redis.get(cacheKey)
        if (recheckedData) {
          // Trả về dữ liệu từ cache
          return response.header('X-Cache', 'HIT').json(JSON.parse(recheckedData))
        }

        // Lưu phương thức response.json gốc
        const originalJson = response.json
        // Ghi đè phương thức json để có thể lưu cache
        response.json = function (body: any) {
          // Lưu kết quả vào cache
          Redis.setex(cacheKey, ttl, JSON.stringify(body)).catch((err) => {
            // Only log actual errors in production
            if (process.env.NODE_ENV !== 'development') {
              console.error('Redis cache error:', err)
            }
          })
          // Gọi phương thức gốc với header cache miss
          return originalJson.call(this, body)
        }

        // Tiếp tục xử lý request
        return next()
      })
    } catch (error) {
      // Only log actual errors in production
      if (process.env.NODE_ENV !== 'development') {
        console.error('Cache middleware error:', error)
      }
      return next()
    }
  }
}
