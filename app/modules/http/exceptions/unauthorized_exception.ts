import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import AppException from '#modules/http/exceptions/app_exception'

/**
 * UnauthorizedException
 *
 * Dùng khi user chưa đăng nhập hoặc token hết hạn (HTTP 401).
 *
 * @example
 * ```typescript
 * import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
 *
 * throw new UnauthorizedException()
 * throw new UnauthorizedException('Token đã hết hạn')
 * throw UnauthorizedException.sessionExpired()
 * ```
 */
export default class UnauthorizedException extends AppException {
  static override status = 401
  static override code = 'E_UNAUTHORIZED'

  constructor(message: string = ErrorMessages.PLEASE_LOGIN, details?: Record<string, unknown>) {
    super(message, { details })
  }

  /**
   * Factory: phiên đăng nhập đã hết hạn
   */
  static sessionExpired(): UnauthorizedException {
    return new UnauthorizedException(ErrorMessages.SESSION_EXPIRED)
  }
}
