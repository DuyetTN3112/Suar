import AppException from '#modules/errors/public_contracts/application_exception'
import {
  ErrorCode,
  ErrorMessages,
  HttpStatus,
} from '#modules/errors/public_contracts/error_constants'

export interface DatabaseExistsQuery {
  where(column: string, value: string): DatabaseExistsQuery
  whereNull(column: string): DatabaseExistsQuery
  select(column: string): DatabaseExistsQuery
  first(): Promise<unknown>
}

export interface DatabaseExistsClient {
  from(table: string): DatabaseExistsQuery
}

export class ValidationDatabaseException extends AppException {
  static override status = HttpStatus.SERVICE_UNAVAILABLE
  static override code = ErrorCode.SERVICE_UNAVAILABLE

  constructor(operation: string, cause: unknown) {
    super('Validation database lookup failed', {
      status: ValidationDatabaseException.status,
      code: ValidationDatabaseException.code,
      category: 'dependency',
      safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
      retryable: true,
      shouldReport: true,
      cause,
      details: { operation },
    })
  }
}

export async function databaseValueExists(
  queryDb: DatabaseExistsClient,
  table: string,
  column: string,
  value: string,
  options: {
    operation: string
    softDelete?: boolean
  }
): Promise<boolean> {
  try {
    const query = queryDb.from(table).where(column, value)
    if (options.softDelete) {
      query.whereNull('deleted_at')
    }

    const row = await query.select(column).first()
    return row !== null && row !== undefined
  } catch (cause) {
    if (cause instanceof AppException) {
      throw cause
    }

    throw new ValidationDatabaseException(options.operation, cause)
  }
}
