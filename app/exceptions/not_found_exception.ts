import { Exception } from '@adonisjs/core/exceptions'

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

  /**
   * Factory method: tạo exception cho resource không tồn tại
   */
  static resource(resourceName: string, id?: string | number): NotFoundException {
    const message = id
      ? `${resourceName} với ID ${id} không tồn tại`
      : `${resourceName} không tồn tại`
    return new NotFoundException(message)
  }
}
