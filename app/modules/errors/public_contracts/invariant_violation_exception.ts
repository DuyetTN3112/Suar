import AppException from '#modules/errors/public_contracts/application_exception'
import {
  ErrorCode,
  ErrorMessages,
  HttpStatus,
} from '#modules/errors/public_contracts/error_constants'

/**
 * Signals a programming, persistence, or configuration invariant violation.
 *
 * The internal message is retained for diagnostics, while clients always receive
 * the generic safe message. These failures are never a user-correctable 4xx.
 */
export default class InvariantViolationException extends AppException {
  static override status = HttpStatus.INTERNAL_SERVER_ERROR
  static override code = ErrorCode.INVARIANT_VIOLATION

  constructor(
    internalMessage: string,
    options: {
      cause?: unknown
      details?: Record<string, unknown>
    } = {}
  ) {
    super(internalMessage, {
      status: InvariantViolationException.status,
      code: InvariantViolationException.code,
      category: 'internal',
      safeMessage: ErrorMessages.INTERNAL_ERROR,
      retryable: false,
      shouldReport: true,
      ...(options.cause === undefined ? {} : { cause: options.cause }),
      ...(options.details === undefined ? {} : { details: options.details }),
    })
  }
}
