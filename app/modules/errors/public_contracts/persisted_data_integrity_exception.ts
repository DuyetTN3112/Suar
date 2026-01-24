import AppException from '#modules/errors/public_contracts/application_exception'
import {
  ErrorCode,
  ErrorMessages,
  HttpStatus,
} from '#modules/errors/public_contracts/error_constants'

/**
 * Signals that persisted data is syntactically readable but violates the
 * application-owned storage contract. This is operationally distinct from
 * invalid user input and from transient database availability failures.
 */
export default class PersistedDataIntegrityException extends AppException {
  static override status = HttpStatus.INTERNAL_SERVER_ERROR
  static override code = ErrorCode.PERSISTED_DATA_INTEGRITY

  constructor(internalMessage: string, details: Record<string, unknown>) {
    super(internalMessage, {
      status: PersistedDataIntegrityException.status,
      code: PersistedDataIntegrityException.code,
      category: 'internal',
      safeMessage: ErrorMessages.INTERNAL_ERROR,
      retryable: false,
      shouldReport: true,
      details,
    })
  }
}
