/**
 * Error Constants
 *
 * Tập trung tất cả error codes, error messages, và HTTP status constants.
 * Thay thế các hardcoded error strings rải rác khắp codebase.
 *
 * Pattern: enum + messages object + helpers
 *
 * @module ErrorConstants
 */

// ============================================================================
// Error Codes — Mã lỗi chuẩn cho hệ thống
// ============================================================================

/**
 * Mã lỗi hệ thống — dùng trong API responses và exception handling.
 * Mapping 1-1 với các Exception classes trong app/exceptions/
 */
export enum ErrorCode {
  // Auth
  UNAUTHORIZED = 'E_UNAUTHORIZED',
  FORBIDDEN = 'E_FORBIDDEN',

  // Resource
  NOT_FOUND = 'E_NOT_FOUND',
  CONFLICT = 'E_CONFLICT',

  // Validation
  VALIDATION = 'E_VALIDATION',

  // Business Logic
  BUSINESS_LOGIC = 'E_BUSINESS_LOGIC',

  // Rate Limit
  RATE_LIMIT = 'E_RATE_LIMIT',

  // Server
  INTERNAL = 'E_INTERNAL_ERROR',

  // CSRF
  CSRF_EXPIRED = 'E_CSRF_EXPIRED',
}

// ============================================================================
// Error Messages — Thông báo lỗi tiếng Việt chuẩn
// ============================================================================

/**
 * Các thông báo lỗi chuẩn hóa bằng tiếng Việt.
 * Dùng thay cho hardcoded strings trong controllers/actions.
 *
 * @example
 * ```typescript
 * import { ErrorMessages } from '#constants'
 *
 * session.flash('error', ErrorMessages.UNAUTHORIZED)
 * throw new UnauthorizedException(ErrorMessages.PLEASE_LOGIN)
 * ```
 */
export const ErrorMessages = {
  // ---- Auth ----
  UNAUTHORIZED: 'Bạn không có quyền thực hiện hành động này',
  PLEASE_LOGIN: 'Vui lòng đăng nhập để tiếp tục',
  NOT_AUTHENTICATED: 'Người dùng chưa xác thực',
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
  CSRF_EXPIRED: 'Trang đã hết hạn, vui lòng thử lại',

  // ---- Forbidden ----
  FORBIDDEN: 'Bạn không có quyền truy cập tài nguyên này',
  FORBIDDEN_ACTION: 'Bạn không có quyền thực hiện hành động này',
  ONLY_OWNER_OR_ADMIN: 'Chỉ owner hoặc admin mới có thể thực hiện hành động này',
  ONLY_SUPERADMIN: 'Chỉ superadmin mới có thể thực hiện hành động này',

  // ---- Not Found ----
  NOT_FOUND: 'Không tìm thấy tài nguyên yêu cầu',
  USER_NOT_FOUND: 'Không tìm thấy người dùng',
  ORGANIZATION_NOT_FOUND: 'Không tìm thấy tổ chức',
  PROJECT_NOT_FOUND: 'Không tìm thấy dự án',
  TASK_NOT_FOUND: 'Không tìm thấy công việc',
  CONVERSATION_NOT_FOUND: 'Không tìm thấy cuộc trò chuyện',
  REVIEW_NOT_FOUND: 'Không tìm thấy đánh giá',
  PAGE_NOT_FOUND: 'Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển',

  // ---- Validation ----
  INVALID_INPUT: 'Dữ liệu đầu vào không hợp lệ',
  INVALID_ID: 'ID không hợp lệ',
  INVALID_EMAIL: 'Định dạng email không hợp lệ',
  FIELD_REQUIRED: 'Trường này là bắt buộc',
  FIELD_TOO_SHORT: 'Giá trị quá ngắn',
  FIELD_TOO_LONG: 'Giá trị quá dài',
  INVALID_DATE_RANGE: 'Ngày kết thúc phải sau ngày bắt đầu',
  NEGATIVE_NUMBER: 'Giá trị không thể là số âm',
  LIMIT_OUT_OF_RANGE: 'Limit phải từ 1 đến 100',
  NO_CHANGES: 'Không có thay đổi nào để cập nhật',

  // ---- Conflict ----
  ALREADY_EXISTS: 'Tài nguyên đã tồn tại',
  DUPLICATE_ENTRY: 'Dữ liệu bị trùng lặp',
  ALREADY_MEMBER: 'Người dùng đã là thành viên',
  ALREADY_APPLIED: 'Bạn đã ứng tuyển rồi',

  // ---- Business Logic ----
  CANNOT_SELF_ACTION: 'Không thể thực hiện hành động này cho chính mình',
  CANNOT_REMOVE_OWNER: 'Không thể xóa owner khỏi dự án',
  CANNOT_REMOVE_CREATOR: 'Không thể xóa người tạo',
  REQUIRE_ORGANIZATION: 'Vui lòng chọn organization',
  MEMBER_NOT_IN_ORGANIZATION: 'Thành viên không thuộc tổ chức của project',
  REQUIRE_REASON: 'Vui lòng cung cấp lý do',
  ONLY_ACTIVE_CAN_REVOKE: 'Chỉ có thể revoke assignments đang active',

  // ---- Rate Limit ----
  RATE_LIMIT: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau',

  // ---- Server ----
  INTERNAL_ERROR: 'Đã xảy ra lỗi hệ thống',
  GENERIC_ERROR: 'Có lỗi xảy ra',
  UNEXPECTED_ERROR: 'Đã xảy ra lỗi không xác định',
  SERVER_ERROR: 'Lỗi máy chủ nội bộ',
} as const

// ErrorMessageKey removed 2026-03-01 — 0 usages

// ============================================================================
// HTTP Status Codes — Tên mô tả cho các HTTP status phổ biến
// ============================================================================

/**
 * HTTP Status codes thường dùng — tránh hardcode số magic.
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  CSRF_EXPIRED: 419,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMIT: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// HttpStatusCode removed 2026-03-01 — 0 usages

// ============================================================================
// API Error Response — Chuẩn hóa format JSON error cho API
// ============================================================================

/**
 * Interface chuẩn cho JSON error response từ API endpoints.
 *
 * @example
 * ```typescript
 * // Response format:
 * {
 *   success: false,
 *   error: {
 *     code: 'E_NOT_FOUND',
 *     message: 'Không tìm thấy dự án với ID 123'
 *   }
 * }
 * ```
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    errors?: Record<string, string>
  }
}

// ApiSuccessResponse removed 2026-03-01 — 0 usages

/**
 * Helper: Tạo chuẩn hóa error response object cho API.
 *
 * @example
 * ```typescript
 * import { createApiError, ErrorCode, ErrorMessages } from '#constants'
 *
 * return response.status(404).json(
 *   createApiError(ErrorCode.NOT_FOUND, ErrorMessages.PROJECT_NOT_FOUND)
 * )
 * ```
 */
export function createApiError(
  code: string,
  message: string,
  errors?: Record<string, string>
): ApiErrorResponse {
  const response: ApiErrorResponse = {
    success: false,
    error: { code, message },
  }
  if (errors && Object.keys(errors).length > 0) {
    response.error.errors = errors
  }
  return response
}

// createApiSuccess removed 2026-03-01 — 0 usages
