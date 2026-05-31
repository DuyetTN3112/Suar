import AppException from '#modules/errors/public_contracts/application_exception'
import {
  flattenValidationIssues,
  validationIssue,
  validationIssuesFromRecord,
  type ValidationIssue,
} from '#modules/errors/public_contracts/validation_issue'

/**
 * ValidationException
 *
 * Dùng khi dữ liệu đầu vào không hợp lệ (HTTP 422).
 * Khác với VineJS validation — đây dùng cho validation logic tùy chỉnh trong DTOs/Actions.
 *
 * @example
 * ```typescript
 * import ValidationException from '#modules/errors/public_contracts/validation_exception'
 *
 * throw new ValidationException('Tên dự án phải có ít nhất 3 ký tự')
 * throw ValidationException.field('email', 'Email không hợp lệ')
 * throw ValidationException.fields({ name: 'Tên là bắt buộc', email: 'Email không hợp lệ' })
 * ```
 */
export default class ValidationException extends AppException {
  static override status = 422
  static override code = 'E_VALIDATION'

  public readonly issues: readonly ValidationIssue[]

  constructor(message: string, errors?: Record<string, string>, issues?: readonly ValidationIssue[]) {
    super(message, errors === undefined ? {} : { errors })
    this.issues =
      issues ??
      (errors
        ? validationIssuesFromRecord(errors)
        : [validationIssue('request', message, 'E_VALIDATION')])
  }

  /**
   * Factory method: tạo validation error cho một field cụ thể
   */
  static field(fieldName: string, message: string): ValidationException {
    return ValidationException.fromIssues([validationIssue(fieldName, message, 'E_VALIDATION')])
  }

  /**
   * Factory method: tạo validation error cho nhiều fields
   */
  static fields(errors: Record<string, string>): ValidationException {
    return ValidationException.fromIssues(
      validationIssuesFromRecord(errors).map((issue) => ({ ...issue, code: 'E_VALIDATION' }))
    )
  }

  static fromIssues(issues: readonly ValidationIssue[]): ValidationException {
    if (issues.length === 0) {
      throw new TypeError('Validation failure requires at least one validation issue')
    }

    const messages = issues.map((issue) => issue.message)
    const message =
      messages.length === 1
        ? (messages[0] ?? 'Validation failed')
        : `${messages.length} lỗi validation`

    return new ValidationException(message, flattenValidationIssues(issues), issues)
  }
}
