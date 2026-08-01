import { createHash } from 'node:crypto'

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { safeCacheLogContext } from '#modules/cache/public_contracts/cache_contract'
import { cacheStore, singleFlight } from '#modules/cache/public_contracts/cache_store'
import { sanitizeErrorLogText } from '#modules/errors/public_contracts/error_sanitization'
import loggerService from '#modules/logger/public_contracts/application_logger'

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
    const orgId = String(
      ctx.currentOrganizationId ?? ctx.session.get('current_organization_id') ?? 'none'
    )
    const prefix = options.prefix ?? 'http_cache'
    const cacheVariant = JSON.stringify({
      userId,
      orgId,
      url: request.url(true),
      accept: request.header('accept') ?? '',
      acceptLanguage: request.header('accept-language') ?? '',
    })
    const variantHash = createHash('sha256').update(cacheVariant).digest('base64url')
    const cacheKey = `${prefix}:v2:${variantHash}`
    const requestState = { nextCalled: false }

    try {
      // Bước 1: Kiểm tra cache trước
      const cachedData = await cacheStore.get<CachedHttpResponse>(cacheKey)
      if (cachedData !== null) {
        response.header('X-Cache', 'HIT')
        this.replayResponse(response, cachedData)
        return
      }

      // Bước 2: Single Flight Pattern — ngăn thundering herd
      // Chỉ 1 request gọi next(), các request khác chờ kết quả
      const singleFlightKey = `sf:${cacheKey}`

      const flightResult = await singleFlight.execute(
        singleFlightKey,
        async (): Promise<CachedHttpResponse | null> => {
          // Double-check sau khi acquire
          const recheckedData = await cacheStore.get<CachedHttpResponse>(cacheKey)
          if (recheckedData !== null) {
            return recheckedData
          }

          // Gọi handler thực sự
          requestState.nextCalled = true
          await next()
          response.header('X-Cache', 'MISS')

          // Cache response thành công (2xx)
          const statusCode = response.getStatus()
          if (statusCode >= 200 && statusCode < 300) {
            const body = response.getBody() as unknown
            const cacheControl = String(response.getHeader('cache-control') ?? '')
            const hasSetCookie = response.getHeader('set-cookie') !== undefined
            if (
              body !== null &&
              body !== undefined &&
              !hasSetCookie &&
              !/(?:^|,)\s*(?:no-store|private)\b/i.test(cacheControl)
            ) {
              try {
                const cachedResponse: CachedHttpResponse = {
                  body: typeof body === 'string' ? body : JSON.stringify(body),
                  statusCode,
                  contentType: String(response.getHeader('content-type') ?? 'application/json'),
                }
                await cacheStore.setBestEffort(cacheKey, cachedResponse, ttl)
                return cachedResponse
              } catch (error) {
                loggerService.error('Cache middleware: response is not cache-serializable', {
                  ...safeCacheLogContext(cacheKey),
                  error: sanitizeErrorLogText(error instanceof Error ? error.message : error),
                })
              }
            }
          }

          return null
        }
      )

      // The leader already owns its response. Followers replay the leader's
      // cacheable result, or execute independently when it was not cacheable.
      if (!requestState.nextCalled && flightResult !== null) {
        response.header('X-Cache', 'HIT')
        this.replayResponse(response, flightResult)
      } else if (!requestState.nextCalled) {
        await next()
      }
    } catch (error) {
      loggerService.error('Cache middleware error, bypassing cache', {
        ...safeCacheLogContext(cacheKey),
        error: sanitizeErrorLogText(error instanceof Error ? error.message : error),
      })
      if (requestState.nextCalled) {
        throw error
      }
      await next()
    }
  }

  private replayResponse(
    response: HttpContext['response'],
    cachedResponse: CachedHttpResponse
  ): void {
    response.status(cachedResponse.statusCode)
    response.header('Content-Type', cachedResponse.contentType)
    response.send(cachedResponse.body)
  }
}

interface CachedHttpResponse {
  body: string
  statusCode: number
  contentType: string
}
