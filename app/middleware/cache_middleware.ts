import cacheService from '#infra/cache/cache_service'
import * as SingleFlightService from '#infra/cache/single_flight_service'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import loggerService from '#infra/logger/logger_service'

/**
 * Cache Middleware — HTTP Response Caching với Single Flight Pattern
 *
 * FIX BẢO MẬT: Cache key bao gồm userId + organizationId
 * để tránh serve data của user A cho user B.
 *
 * FIX CONCURRENT: Tách logic SingleFlight rõ ràng:
 * - Nếu cache HIT → return cached data, KHÔNG gọi next()
 * - Nếu cache MISS → dùng SingleFlight để chỉ 1 request gọi next()
 * - Concurrent requests chờ kết quả từ SingleFlight, nhận cached data
 */
export default class CacheMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { ttl?: number; prefix?: string } = {}
  ): Promise<void> {
    const { request, response } = ctx
    const ttl = options.ttl ?? 3600

    // Chỉ cache GET requests
    if (request.method() !== 'GET') {
      await next()
      return
    }

    // === Tạo cache key AN TOÀN — bao gồm user context ===
    const userId = ctx.auth.user?.id ?? 'anonymous'
    const orgId = String(ctx.session.get('current_organization_id') ?? 'none')
    const prefix = options.prefix ?? 'http_cache'
    const cacheKey = `${prefix}:u${userId}:o${orgId}:${request.url()}`

    try {
      // Bước 1: Kiểm tra cache trước
      const cachedData = await cacheService.get<string>(cacheKey)
      if (cachedData) {
        response.header('X-Cache', 'HIT')
        response.header('Content-Type', 'application/json')
        response.send(cachedData)
        return
      }

      // Bước 2: Single Flight Pattern — ngăn thundering herd
      // Chỉ 1 request gọi next(), các request khác chờ kết quả
      const singleFlightKey = `sf:${cacheKey}`

      // FIX: SingleFlight trả về cached data hoặc null
      // Nếu null → request này là “leader”, cần gọi next()
      const flightResult = await SingleFlightService.execute(
        singleFlightKey,
        async (): Promise<string | null> => {
          // Double-check sau khi acquire
          const recheckedData = await cacheService.get<string>(cacheKey)
          if (recheckedData) {
            return recheckedData
          }

          // Gọi handler thực sự
          await next()

          // Cache response thành công (2xx)
          const statusCode = response.getStatus()
          if (statusCode >= 200 && statusCode < 300) {
            const body = response.getBody() as unknown
            if (body !== null && body !== undefined) {
              const serialized = typeof body === 'string' ? body : JSON.stringify(body)
              // Cache async — không block response
              cacheService.set(cacheKey, serialized, ttl).catch((err: unknown) => {
                loggerService.error('Cache middleware: failed to set cache', {
                  cacheKey,
                  error: err instanceof Error ? err.message : String(err),
                })
              })
            }
          }

          response.header('X-Cache', 'MISS')
          // Return null để signal rằng next() đã được gọi
          return null
        }
      )

      // Nếu SingleFlight trả về cached data (từ double-check)
      // → đây là concurrent request, next() CHƯA được gọi cho request này
      if (flightResult !== null) {
        response.header('X-Cache', 'HIT')
        response.header('Content-Type', 'application/json')
        response.send(flightResult)
      }
    } catch (error) {
      loggerService.error('Cache middleware error, bypassing cache', {
        cacheKey,
        error: error instanceof Error ? error.message : String(error),
      })
      // Cache lỗi → vẫn serve response bình thường
      await next()
    }
  }
}
