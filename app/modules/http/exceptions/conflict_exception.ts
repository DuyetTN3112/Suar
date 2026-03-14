import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import AppException from '#modules/http/exceptions/app_exception'

/**
 * ConflictException
 *
 * Dùng khi có xung đột dữ liệu: trùng lặp, đã tồn tại (HTTP 409).
 *
 * @example
 * ```typescript
 * import ConflictException from '#modules/http/exceptions/conflict_exception'
 *
 * throw new ConflictException('Email đã được sử dụng')
 * throw ConflictException.duplicate('User', 'email')
 * throw ConflictException.alreadyExists('Bạn đã ứng tuyển task này')
 * ```
 */
export default class ConflictException extends AppException {
  static override status = 409
  static override code = 'E_CONFLICT'

  constructor(message: string = ErrorMessages.ALREADY_EXISTS, details?: Record<string, unknown>) {
    super(message, { details })
  }

  /**
   * Factory method: resource trùng lặp theo field
   */
  static duplicate(resourceName: string, field?: string): ConflictException {
    const message = field
      ? `${resourceName} với ${field} này đã tồn tại`
      : `${resourceName} đã tồn tại`
    return new ConflictException(message, {
      resource: resourceName,
      field: field ?? null,
    })
  }

  /**
   * Factory method: hành động đã được thực hiện rồi
   */
  static alreadyExists(message: string): ConflictException {
    return new ConflictException(message)
  }
}
