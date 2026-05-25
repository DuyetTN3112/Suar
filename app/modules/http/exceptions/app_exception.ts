import { Exception } from '@adonisjs/core/exceptions'

import { ErrorCode, ErrorMessages, HttpStatus } from '#modules/errors/public_contracts/error_constants'

export interface AppExceptionOptions {
  details?: Record<string, unknown>
  errors?: Record<string, string>
  shouldReport?: boolean
}

export default class AppException extends Exception {
  static override status: number = HttpStatus.INTERNAL_SERVER_ERROR
  static override code: string = ErrorCode.INTERNAL

  public readonly details?: Record<string, unknown>
  public readonly errors: Record<string, string>
  public readonly shouldReport: boolean

  constructor(message: string = ErrorMessages.INTERNAL_ERROR, options: AppExceptionOptions = {}) {
    super(message)

    const ctor = this.constructor as typeof AppException
    this.status = ctor.status
    this.code = ctor.code
    this.details = options.details
    this.errors = options.errors ?? {}
    this.shouldReport =
      options.shouldReport ??
      (this.status >= HttpStatus.INTERNAL_SERVER_ERROR || this.status === HttpStatus.RATE_LIMIT)
  }
}
