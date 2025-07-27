export interface AppErrorOptions {
  code?: string
  statusCode?: number
  isOperational?: boolean
  metadata?: Record<string, unknown>
  cause?: Error
}

export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly metadata?: Record<string, unknown>

  constructor(message: string, options?: AppErrorOptions) {
    super(message)
    this.name = 'AppError'
    this.code = options?.code ?? 'UNKNOWN_ERROR'
    this.statusCode = options?.statusCode ?? 500
    this.isOperational = options?.isOperational ?? true
    this.metadata = options?.metadata

    Error.captureStackTrace(this, AppError)

    if (options?.cause) {
      this.cause = options.cause
    }
  }

  static notFound(resource: string, id?: string | number): AppError {
    const message = id ? `${resource} với ID ${id} không tồn tại` : `${resource} không tồn tại`
    return new AppError(message, {
      code: 'NOT_FOUND',
      statusCode: 404,
    })
  }

  static forbidden(message = 'Bạn không có quyền thực hiện hành động này'): AppError {
    return new AppError(message, {
      code: 'FORBIDDEN',
      statusCode: 403,
    })
  }

  static validation(message: string, field?: string): AppError {
    return new AppError(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      metadata: field ? { field } : undefined,
    })
  }

  static unauthorized(message = 'Vui lòng đăng nhập để tiếp tục'): AppError {
    return new AppError(message, {
      code: 'UNAUTHORIZED',
      statusCode: 401,
    })
  }

  static conflict(resource: string, field?: string): AppError {
    const message = field ? `${resource} với ${field} này đã tồn tại` : `${resource} đã tồn tại`
    return new AppError(message, {
      code: 'CONFLICT',
      statusCode: 409,
    })
  }

  static internal(message = 'Đã xảy ra lỗi hệ thống'): AppError {
    return new AppError(message, {
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      isOperational: false,
    })
  }
}
