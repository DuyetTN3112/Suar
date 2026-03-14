import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import AppException from '#modules/http/exceptions/app_exception'

/**
 * NotFoundException
 *
 * Dùng khi resource không tồn tại (HTTP 404).
 *
 * @example
 * ```typescript
 * import NotFoundException from '#modules/http/exceptions/not_found_exception'
 *
 * throw new NotFoundException('Dự án không tồn tại')
 * throw NotFoundException.resource('Dự án', 123)
 * ```
 */
export default class NotFoundException extends AppException {
  static override status = 404
  static override code = 'E_NOT_FOUND'

  constructor(message: string = ErrorMessages.NOT_FOUND, details?: Record<string, unknown>) {
    super(message, { details })
  }

  /**
   * Factory method: tạo exception cho resource không tồn tại
   */
  static resource(resourceName: string, id?: string | number): NotFoundException {
    const message = id
      ? `${resourceName} với ID ${id} không tồn tại`
      : `${resourceName} không tồn tại`
    return new NotFoundException(message, {
      resource: resourceName,
      id: id ?? null,
    })
  }

  // --- Convenience factories cho các resource phổ biến ---

  static user(id?: string | number): NotFoundException {
    return new NotFoundException(
      id ? `${ErrorMessages.USER_NOT_FOUND} (ID: ${id})` : ErrorMessages.USER_NOT_FOUND
    )
  }

  static organization(id?: string | number): NotFoundException {
    return new NotFoundException(
      id
        ? `${ErrorMessages.ORGANIZATION_NOT_FOUND} (ID: ${id})`
        : ErrorMessages.ORGANIZATION_NOT_FOUND
    )
  }

  static project(id?: string | number): NotFoundException {
    return new NotFoundException(
      id ? `${ErrorMessages.PROJECT_NOT_FOUND} (ID: ${id})` : ErrorMessages.PROJECT_NOT_FOUND
    )
  }

  static task(id?: string | number): NotFoundException {
    return new NotFoundException(
      id ? `${ErrorMessages.TASK_NOT_FOUND} (ID: ${id})` : ErrorMessages.TASK_NOT_FOUND
    )
  }
}
