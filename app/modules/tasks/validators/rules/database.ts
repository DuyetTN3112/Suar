import vine from '@vinejs/vine'

import AppException from '#modules/errors/public_contracts/application_exception'
import {
  ErrorCode,
  ErrorMessages,
  HttpStatus,
} from '#modules/errors/public_contracts/error_constants'

interface DatabaseExistsQuery {
  where(column: string, value: string): DatabaseExistsQuery
  whereNull(column: string): DatabaseExistsQuery
  select(column: string): DatabaseExistsQuery
  first(): Promise<unknown>
}

interface DatabaseExistsClient {
  from(table: string): DatabaseExistsQuery
}

interface DatabaseExistsOptions {
  softDelete?: boolean
}

interface DatabaseExistsLookup {
  table: string
  column: string
  value: string
  options: DatabaseExistsOptions
}

export class TaskValidationDatabaseException extends AppException {
  static override status = HttpStatus.SERVICE_UNAVAILABLE
  static override code = ErrorCode.SERVICE_UNAVAILABLE

  constructor(cause: unknown) {
    super('Task validation database lookup failed', {
      status: TaskValidationDatabaseException.status,
      code: TaskValidationDatabaseException.code,
      category: 'dependency',
      safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
      retryable: true,
      shouldReport: true,
      cause,
      details: {
        operation: 'task_validation.exists',
      },
    })
  }
}

function buildDatabaseExistsQuery(
  queryDb: DatabaseExistsClient,
  lookup: DatabaseExistsLookup
): DatabaseExistsQuery {
  const query = queryDb.from(lookup.table).where(lookup.column, lookup.value)

  if (lookup.options.softDelete) {
    query.whereNull('deleted_at')
  }

  return query
}

async function readDatabaseExistsRow(
  queryDb: DatabaseExistsClient,
  lookup: DatabaseExistsLookup
): Promise<unknown> {
  return buildDatabaseExistsQuery(queryDb, lookup).select(lookup.column).first()
}

function databaseRowExists(row: unknown): boolean {
  return row !== null && row !== undefined
}

function mapDatabaseLookupError(cause: unknown): AppException {
  if (cause instanceof AppException) {
    return cause
  }

  return new TaskValidationDatabaseException(cause)
}

export async function taskDatabaseValueExists(
  queryDb: DatabaseExistsClient,
  table: string,
  column: string,
  value: string,
  options: DatabaseExistsOptions = {}
): Promise<boolean> {
  try {
    const row = await readDatabaseExistsRow(queryDb, { table, column, value, options })
    return databaseRowExists(row)
  } catch (cause) {
    throw mapDatabaseLookupError(cause)
  }
}

const existsRule = (table: string, column = 'id', options: DatabaseExistsOptions = {}) => {
  return vine
    .string()
    .uuid()
    .exists((queryDb, value) => {
      return taskDatabaseValueExists(queryDb, table, column, value, options)
    })
}

export const taskIdRule = () => existsRule('tasks', 'id', { softDelete: true })
export const userIdRule = () => existsRule('users', 'id', { softDelete: true })
