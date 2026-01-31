/**
 * Error Utility Helper
 *
 * Chuẩn hóa error handling cho toàn bộ dự án Suar.
 * Pattern này đảm bảo type-safe khi xử lý errors trong catch blocks.
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
 * Custom AppError class để quản lý các lỗi trong ứng dụng
 * Hỗ trợ error code, status code và metadata
 */
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly metadata?: Record<string, unknown>

  constructor(
    message: string,
    options?: {
      code?: string
      statusCode?: number
      isOperational?: boolean
      metadata?: Record<string, unknown>
      cause?: Error
    }
  ) {
    super(message)
    this.name = 'AppError'
    this.code = options?.code ?? 'UNKNOWN_ERROR'
    this.statusCode = options?.statusCode ?? 500
    this.isOperational = options?.isOperational ?? true
    this.metadata = options?.metadata

    // Maintain proper stack trace in V8
    Error.captureStackTrace(this, AppError)

    // Set cause if provided
    if (options?.cause) {
      this.cause = options.cause
    }
  }

  /**
   * Tạo AppError cho lỗi không tìm thấy resource
   */
  static notFound(resource: string, id?: string | number): AppError {
    const message = id ? `${resource} với ID ${id} không tồn tại` : `${resource} không tồn tại`
    return new AppError(message, {
      code: 'NOT_FOUND',
      statusCode: 404,
    })
  }

  /**
   * Tạo AppError cho lỗi không có quyền
   */
  static forbidden(message = 'Bạn không có quyền thực hiện hành động này'): AppError {
    return new AppError(message, {
      code: 'FORBIDDEN',
      statusCode: 403,
    })
  }

  /**
   * Tạo AppError cho lỗi validation
   */
  static validation(message: string, field?: string): AppError {
    return new AppError(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      metadata: field ? { field } : undefined,
    })
  }

  /**
   * Tạo AppError cho lỗi unauthorized
   */
  static unauthorized(message = 'Vui lòng đăng nhập để tiếp tục'): AppError {
    return new AppError(message, {
      code: 'UNAUTHORIZED',
      statusCode: 401,
    })
  }

  /**
   * Tạo AppError cho lỗi conflict (trùng lặp dữ liệu)
   */
  static conflict(resource: string, field?: string): AppError {
    const message = field ? `${resource} với ${field} này đã tồn tại` : `${resource} đã tồn tại`
    return new AppError(message, {
      code: 'CONFLICT',
      statusCode: 409,
    })
  }

  /**
   * Tạo AppError cho lỗi internal server
   */
  static internal(message = 'Đã xảy ra lỗi hệ thống'): AppError {
    return new AppError(message, {
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      isOperational: false,
    })
  }
}

/**
 * Type guard để kiểm tra xem một value có phải là Error hay không
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error
}

/**
 * Type guard để kiểm tra xem một value có phải là AppError hay không
 */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}

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
export function getErrorMessage(error: unknown, fallbackMessage = 'Có lỗi xảy ra'): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  return fallbackMessage
}

/**
 * Trích xuất error code từ một error
 *
 * @param error - Giá trị unknown từ catch block
 * @returns Error code hoặc undefined
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isAppError(error)) {
    return error.code
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === 'string') {
      return code
    }
  }

  return undefined
}

/**
 * Trích xuất status code từ một error
 *
 * @param error - Giá trị unknown từ catch block
 * @param fallbackStatus - Status code mặc định
 * @returns HTTP status code
 */
export function getErrorStatusCode(error: unknown, fallbackStatus = 500): number {
  if (isAppError(error)) {
    return error.statusCode
  }

  if (error && typeof error === 'object') {
    if (
      'statusCode' in error &&
      typeof (error as { statusCode: unknown }).statusCode === 'number'
    ) {
      return (error as { statusCode: number }).statusCode
    }
    if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
      return (error as { status: number }).status
    }
  }

  return fallbackStatus
}

/**
 * Wrap một hàm async và tự động handle errors
 *
 * @param fn - Hàm async cần wrap
 * @param onError - Callback khi có lỗi
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  onError: (error: unknown, message: string) => T
): Promise<T> {
  return fn().catch((error: unknown) => {
    const message = getErrorMessage(error)
    return onError(error, message)
  })
}

/**
 * Tạo một error object đã được serialize để trả về cho client
 * Tự động ẩn chi tiết lỗi trong production
 */
export function serializeError(
  error: unknown,
  includeDetails = false
): { error: string; code?: string; details?: string } {
  const message = getErrorMessage(error)
  const code = getErrorCode(error)

  const result: { error: string; code?: string; details?: string } = {
    error: message,
  }

  if (code) {
    result.code = code
  }

  if (includeDetails && isError(error)) {
    result.details = error.stack
  }

  return result
}

/**
 * Log error với format chuẩn
 */
export function logError(
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>
): void {
  const message = getErrorMessage(error)
  const code = getErrorCode(error)
  const stack = isError(error) ? error.stack : undefined

  console.error(`[${context}] Error:`, {
    message,
    code,
    stack,
    ...additionalData,
  })
}
