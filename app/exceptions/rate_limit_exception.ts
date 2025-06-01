import { Exception } from '@adonisjs/core/exceptions'

/**
 * RateLimitException
 *
 * Dùng khi user vượt quá giới hạn request (HTTP 429).
 *
 * @example
 * ```typescript
 * import RateLimitException from '#exceptions/rate_limit_exception'
 *
 * throw new RateLimitException()
 * throw new RateLimitException('Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi 60 giây.', 60)
 * ```
 */
export default class RateLimitException extends Exception {
  static override status = 429
  static override code = 'E_RATE_LIMIT'

  /**
   * Thời gian (giây) cần đợi trước khi thử lại
   */
  public readonly retryAfter?: number

  constructor(message = 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau', retryAfter?: number) {
    super(message)
    this.retryAfter = retryAfter
  }
}
