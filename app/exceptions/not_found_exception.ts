import { Exception } from '@adonisjs/core/exceptions'

import { ErrorMessages } from '#constants/error_constants'

/**
 * NotFoundException
 *
 * Dùng khi resource không tồn tại (HTTP 404).
 *
 * @example
 * ```typescript
 * import NotFoundException from '#exceptions/not_found_exception'
 *
 * throw new NotFoundException('Dự án không tồn tại')
 * throw NotFoundException.resource('Dự án', 123)
 * ```
 */
export default class NotFoundException extends Exception {
  static override status = 404
  static override code = 'E_NOT_FOUND'

  constructor(message: string = ErrorMessages.NOT_FOUND) {
    super(message)
  }

  /**
   * Factory method: tạo exception cho resource không tồn tại
   */
  static resource(resourceName: string, id?: string | number): NotFoundException {
    const message = id
      ? `${resourceName} với ID ${id} không tồn tại`
      : `${resourceName} không tồn tại`
    return new NotFoundException(message)
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
