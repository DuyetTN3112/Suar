import AppException from '#modules/errors/public_contracts/application_exception'
import {
  ErrorCode,
  ErrorMessages,
  HttpStatus,
} from '#modules/errors/public_contracts/error_constants'

/**
 * Represents a retryable outage of an infrastructure dependency.
 *
 * Dependency and operation are caller-owned, low-cardinality identifiers.
 * Raw driver diagnostics remain available only through `cause`.
 */
export default class DependencyUnavailableException extends AppException {
  static override status = HttpStatus.SERVICE_UNAVAILABLE
  static override code = ErrorCode.SERVICE_UNAVAILABLE

  constructor(
    dependency: string,
    operation: string,
    options: {
      cause?: unknown
    } = {}
  ) {
    super(`${dependency} dependency failed during ${operation}`, {
      status: DependencyUnavailableException.status,
      code: DependencyUnavailableException.code,
      category: 'dependency',
      safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
      retryable: true,
      shouldReport: true,
      ...(options.cause === undefined ? {} : { cause: options.cause }),
      details: {
        dependency,
        operation,
      },
    })
  }
}
