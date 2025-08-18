import { Exception } from '@adonisjs/core/exceptions'

import { ErrorMessages } from '#constants/error_constants'

/**
 * UnauthorizedException
 *
 * Dùng khi user chưa đăng nhập hoặc token hết hạn (HTTP 401).
 *
 * @example
 * ```typescript
 * import UnauthorizedException from '#exceptions/unauthorized_exception'
 *
 * throw new UnauthorizedException()
 * throw new UnauthorizedException('Token đã hết hạn')
 * throw UnauthorizedException.sessionExpired()
 * ```
 */
export default class UnauthorizedException extends Exception {
  static override status = 401
  static override code = 'E_UNAUTHORIZED'

  constructor(message: string = ErrorMessages.PLEASE_LOGIN) {
    super(message)
  }

  /**
   * Factory: phiên đăng nhập đã hết hạn
   */
  static sessionExpired(): UnauthorizedException {
    return new UnauthorizedException(ErrorMessages.SESSION_EXPIRED)
  }
}
