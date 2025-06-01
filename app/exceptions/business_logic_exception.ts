import { Exception } from '@adonisjs/core/exceptions'

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
 * throw new BusinessLogicException('Start date không được lớn hơn end date')
 * ```
 */
export default class BusinessLogicException extends Exception {
  static override status = 400
  static override code = 'E_BUSINESS_LOGIC'
}
