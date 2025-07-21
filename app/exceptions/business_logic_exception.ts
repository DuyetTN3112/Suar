import { Exception } from '@adonisjs/core/exceptions'

import { ErrorMessages } from '#constants/error_constants'

/**
 * BusinessLogicException
 *
 * Dùng khi vi phạm business rule nhưng không phải lỗi hệ thống (HTTP 400).
 * Ví dụ: "Không thể transfer ownership cho chính mình", "Start date phải trước end date".
 *
 * @example
 * ```typescript
 * import BusinessLogicException from '#exceptions/business_logic_exception'
 *
 * throw new BusinessLogicException('Không thể xóa owner khỏi dự án')
 * throw BusinessLogicException.cannotSelfAction('thay đổi vai trò')
 * throw BusinessLogicException.invalidState('Yêu cầu đã được xử lý')
 * ```
 */
export default class BusinessLogicException extends Exception {
  static override status = 400
  static override code = 'E_BUSINESS_LOGIC'

  constructor(message: string = ErrorMessages.GENERIC_ERROR) {
    super(message)
  }

  /**
   * Factory: không thể thực hiện hành động cho chính mình
   */
  static cannotSelfAction(actionName: string): BusinessLogicException {
    return new BusinessLogicException(`Không thể ${actionName} cho chính mình`)
  }

  /**
   * Factory: trạng thái không hợp lệ để thực hiện hành động
   */
  static invalidState(description: string): BusinessLogicException {
    return new BusinessLogicException(description)
  }

  /**
   * Factory: không có thay đổi nào để cập nhật
   */
  static noChanges(): BusinessLogicException {
    return new BusinessLogicException(ErrorMessages.NO_CHANGES)
  }

  /**
   * Factory: thành viên không thuộc tổ chức
   */
  static memberNotInOrganization(): BusinessLogicException {
    return new BusinessLogicException(ErrorMessages.MEMBER_NOT_IN_ORGANIZATION)
  }
}
