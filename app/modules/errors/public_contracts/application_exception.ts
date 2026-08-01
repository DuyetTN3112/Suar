import {
  ErrorCode,
  ErrorMessages,
  HttpStatus,
} from '#modules/errors/public_contracts/error_constants'

export interface AppExceptionOptions {
  status?: number
  code?: string
  category?: AppErrorCategory
  safeMessage?: string
  retryable?: boolean
  cause?: unknown
  details?: Record<string, unknown>
  errors?: Record<string, string>
  shouldReport?: boolean
}

export type AppErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'dependency'
  | 'internal'
  | 'business'

function categoryFromStatus(status: number): AppErrorCategory {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return 'authentication'
    case HttpStatus.FORBIDDEN:
      return 'authorization'
    case HttpStatus.NOT_FOUND:
      return 'not_found'
    case HttpStatus.CONFLICT:
      return 'conflict'
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'validation'
    case HttpStatus.RATE_LIMIT:
      return 'rate_limit'
    case HttpStatus.SERVICE_UNAVAILABLE:
    case HttpStatus.GATEWAY_TIMEOUT:
      return 'dependency'
    case HttpStatus.BAD_REQUEST:
      return 'business'
    default:
      return 'internal'
  }
}

export default class AppException extends Error {
  static status: number = HttpStatus.INTERNAL_SERVER_ERROR
  static code: string = ErrorCode.INTERNAL

  public readonly status: number
  public readonly code: string
  public readonly category: AppErrorCategory
  public readonly safeMessage: string
  public readonly retryable: boolean
  public readonly details?: Record<string, unknown>
  public readonly errors: Record<string, string>
  public readonly shouldReport: boolean

  constructor(message: string = ErrorMessages.INTERNAL_ERROR, options: AppExceptionOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = new.target.name

    const ctor = this.constructor as typeof AppException
    this.status = options.status ?? ctor.status
    this.code = options.code ?? ctor.code
    this.category = options.category ?? categoryFromStatus(this.status)
    this.safeMessage =
      options.safeMessage ??
      (this.status >= HttpStatus.INTERNAL_SERVER_ERROR ? ErrorMessages.INTERNAL_ERROR : message)
    this.retryable = options.retryable ?? false
    if (options.details !== undefined) {
      this.details = options.details
    }
    this.errors = options.errors ?? {}
    this.shouldReport =
      options.shouldReport ??
      (this.status >= HttpStatus.INTERNAL_SERVER_ERROR || this.status === HttpStatus.RATE_LIMIT)
  }
}
