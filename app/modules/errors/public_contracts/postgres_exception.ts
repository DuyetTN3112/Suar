import AppException from '#modules/errors/public_contracts/application_exception'
import { classifyPostgresError } from '#modules/errors/public_contracts/postgres_error_classifier'

export default class PostgresException extends AppException {
  static from(error: unknown): PostgresException | null {
    const classification = classifyPostgresError(error)
    if (classification === null) {
      return null
    }

    return new PostgresException(error, classification)
  }

  private constructor(
    cause: unknown,
    classification: NonNullable<ReturnType<typeof classifyPostgresError>>
  ) {
    const internalMessage =
      cause instanceof Error
        ? cause.message
        : `PostgreSQL failure (${classification.sqlState ?? classification.source})`

    super(internalMessage, {
      status: classification.status,
      code: classification.code,
      category: classification.category,
      safeMessage: classification.safeMessage,
      retryable: classification.retryable,
      shouldReport: classification.shouldReport,
      cause,
      details: {
        source: classification.source,
        ...(classification.sqlState === null ? {} : { sqlState: classification.sqlState }),
        retryable: classification.retryable,
      },
    })
  }
}
