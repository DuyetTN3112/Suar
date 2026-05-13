/**
 * Error Utility Helper
 *
 * Chuẩn hóa error handling cho toàn bộ dự án Suar.
 * Pattern này đảm bảo type-safe khi xử lý errors trong catch blocks.
 *
 * TÍCH HỢP VỚI:
 * - Exception classes: #exceptions/* (ForbiddenException, NotFoundException, etc.)
 * - Error constants: #modules/errors/constants/error_constants (ErrorCode, ErrorMessages, HttpStatus)
 * - Exception handler: #exceptions/handler (tự động xử lý exception theo status code)
 *
 * KHUYẾN NGHỊ:
 * - Trong actions/services: throw exception classes thay vì throw new Error()
 * - Trong controllers: dùng handleControllerError() thay vì try/catch thủ công
 * - AppError vẫn hoạt động nhưng KHÔNG tích hợp với AdonisJS exception handler
 *
 * @module ErrorUtils
 * @example
 * ```typescript
 * import { getErrorMessage, isAppError, AppError } from '#libs/error_utils'
 *
 * try {
 *   await someOperation()
 * } catch (error) {
 *   const message = getErrorMessage(error, 'Có lỗi xảy ra')
 *   session.flash('error', message)
 * }
 * ```
 */

/**
 * Legacy note: ưu tiên Exception classes từ `#exceptions/index`.
 * - `NotFoundException.resource('Project', id)` thay cho `AppError.notFound('Project', id)`
 * - `ForbiddenException.action('...')` thay cho `AppError.forbidden('...')`
 * - `ValidationException.field('email', '...')` thay cho `AppError.validation('...', 'email')`
 * - `UnauthorizedException` thay cho `AppError.unauthorized()`
 * - `ConflictException.duplicate('User', 'email')` thay cho `AppError.conflict('User', 'email')`
 *
 * AppError KHÔNG tích hợp với AdonisJS exception handler.
 * Exception classes sẽ tự động được handler.ts xử lý đúng format cho cả API và Inertia.
 *
 * @see {@link file://#exceptions/index}
 */
export { AppError } from './error_utils/app_error.js'

/**
 * Trích xuất message từ một error hoặc unknown value
 * Đây là helper chính để xử lý catch blocks một cách type-safe
 *
 * @param error - Giá trị unknown từ catch block
 * @param fallbackMessage - Message mặc định nếu không thể extract được
 * @returns Error message string
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation()
 * } catch (error) {
 *   const message = getErrorMessage(error, 'Có lỗi xảy ra')
 *   console.error(message)
 * }
 * ```
 */
export {
  getErrorCode,
  getErrorMessage,
  getErrorStatusCode,
  isAppError,
  isError,
} from './error_utils/extractors.js'

/**
 * Trích xuất error code từ một error
 *
 * @param error - Giá trị unknown từ catch block
 * @returns Error code hoặc undefined
 */
export { logError, serializeError, withErrorHandling } from './error_utils/reporting.js'

/**
 * Tạo một error object đã được serialize để trả về cho client
 * Tự động ẩn chi tiết lỗi trong production
 */
export {
  handleApiControllerError,
  handleControllerError,
} from './error_utils/controller_handlers.js'
