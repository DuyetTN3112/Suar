import { Exception } from '@adonisjs/core/exceptions'

/**
 * ValidationException
 *
 * Dùng khi dữ liệu đầu vào không hợp lệ (HTTP 422).
 * Khác với VineJS validation — đây dùng cho validation logic tùy chỉnh trong DTOs/Actions.
 *
 * @example
 * ```typescript
 * import ValidationException from '#exceptions/validation_exception'
 *
 * throw new ValidationException('Tên dự án phải có ít nhất 3 ký tự')
 * throw ValidationException.field('email', 'Email không hợp lệ')
 * throw ValidationException.fields({ name: 'Tên là bắt buộc', email: 'Email không hợp lệ' })
 * ```
 */
export default class ValidationException extends Exception {
  static override status = 422
  static override code = 'E_VALIDATION'

  /**
   * Các lỗi validation theo field
   */
  public readonly errors: Record<string, string>

  constructor(message: string, errors?: Record<string, string>) {
    super(message)
    this.errors = errors ?? {}
  }

  /**
   * Factory method: tạo validation error cho một field cụ thể
   */
  static field(fieldName: string, message: string): ValidationException {
    return new ValidationException(message, { [fieldName]: message })
  }

  /**
   * Factory method: tạo validation error cho nhiều fields
   */
  static fields(errors: Record<string, string>): ValidationException {
    const messages = Object.values(errors)
    const message = messages.length === 1 ? messages[0]! : `${messages.length} lỗi validation`
    return new ValidationException(message, errors)
  }
}
