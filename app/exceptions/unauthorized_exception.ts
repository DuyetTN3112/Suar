import { Exception } from '@adonisjs/core/exceptions'

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
 * ```
 */
export default class UnauthorizedException extends Exception {
  static override status = 401
  static override code = 'E_UNAUTHORIZED'

  constructor(message = 'Vui lòng đăng nhập để tiếp tục') {
    super(message)
  }
}
