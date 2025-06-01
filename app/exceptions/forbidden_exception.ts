import { Exception } from '@adonisjs/core/exceptions'
import { ErrorMessages } from '#constants/error_constants'

/**
 * ForbiddenException
 *
 * Dùng khi user không có quyền thực hiện hành động (HTTP 403).
 *
 * @example
 * ```typescript
 * import ForbiddenException from '#exceptions/forbidden_exception'
 *
 * throw new ForbiddenException()
 * throw new ForbiddenException('Bạn không có quyền xem tổ chức này')
 * throw ForbiddenException.action('xóa thành viên')
 * throw ForbiddenException.onlyRole('owner hoặc admin')
 * ```
 */
export default class ForbiddenException extends Exception {
  static override status = 403
  static override code = 'E_FORBIDDEN'

  constructor(message: string = ErrorMessages.FORBIDDEN_ACTION) {
    super(message)
  }

  /**
   * Factory: không có quyền thực hiện hành động cụ thể
   */
  static action(actionName: string): ForbiddenException {
    return new ForbiddenException(`Bạn không có quyền ${actionName}`)
  }

  /**
   * Factory: chỉ role cụ thể mới được thực hiện
   */
  static onlyRole(roleName: string): ForbiddenException {
    return new ForbiddenException(`Chỉ ${roleName} mới có thể thực hiện hành động này`)
  }

  /**
   * Factory: chỉ owner hoặc admin mới được thực hiện
   */
  static onlyOwnerOrAdmin(actionName?: string): ForbiddenException {
    const message = actionName
      ? `Chỉ owner hoặc admin mới có thể ${actionName}`
      : ErrorMessages.ONLY_OWNER_OR_ADMIN
    return new ForbiddenException(message)
  }

  /**
   * Factory: chỉ superadmin mới được thực hiện
   */
  static onlySuperAdmin(actionName?: string): ForbiddenException {
    const message = actionName
      ? `Chỉ superadmin mới có thể ${actionName}`
      : ErrorMessages.ONLY_SUPERADMIN
    return new ForbiddenException(message)
  }
}
