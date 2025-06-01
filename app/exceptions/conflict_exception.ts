import { Exception } from '@adonisjs/core/exceptions'

/**
 * ConflictException
 *
 * Dùng khi có xung đột dữ liệu: trùng lặp, đã tồn tại (HTTP 409).
 *
 * @example
 * ```typescript
 * import ConflictException from '#exceptions/conflict_exception'
 *
 * throw new ConflictException('Email đã được sử dụng')
 * throw ConflictException.duplicate('User', 'email')
 * throw ConflictException.alreadyExists('Bạn đã ứng tuyển task này')
 * ```
 */
export default class ConflictException extends Exception {
  static override status = 409
  static override code = 'E_CONFLICT'

  /**
   * Factory method: resource trùng lặp theo field
   */
  static duplicate(resourceName: string, field?: string): ConflictException {
    const message = field
      ? `${resourceName} với ${field} này đã tồn tại`
      : `${resourceName} đã tồn tại`
    return new ConflictException(message)
  }

  /**
   * Factory method: hành động đã được thực hiện rồi
   */
  static alreadyExists(message: string): ConflictException {
    return new ConflictException(message)
  }
}
