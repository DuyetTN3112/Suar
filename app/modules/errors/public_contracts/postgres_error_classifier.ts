import type { AppErrorCategory } from '#modules/errors/public_contracts/application_exception'
import {
  ErrorCode,
  ErrorMessages,
  HttpStatus,
} from '#modules/errors/public_contracts/error_constants'

export const POSTGRES_SQL_STATES = {
  CONNECTION_EXCEPTION: '08000',
  SQLCLIENT_UNABLE_TO_ESTABLISH_CONNECTION: '08001',
  CONNECTION_DOES_NOT_EXIST: '08003',
  SERVER_REJECTED_CONNECTION: '08004',
  CONNECTION_FAILURE: '08006',
  TRANSACTION_RESOLUTION_UNKNOWN: '08007',
  PROTOCOL_VIOLATION: '08P01',
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  DISK_FULL: '53100',
  OUT_OF_MEMORY: '53200',
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01',
  LOCK_NOT_AVAILABLE: '55P03',
  TOO_MANY_CONNECTIONS: '53300',
  CONFIGURATION_LIMIT_EXCEEDED: '53400',
  QUERY_CANCELED: '57014',
  ADMIN_SHUTDOWN: '57P01',
  CRASH_SHUTDOWN: '57P02',
  CANNOT_CONNECT_NOW: '57P03',
} as const

export type SupportedPostgresSqlState =
  (typeof POSTGRES_SQL_STATES)[keyof typeof POSTGRES_SQL_STATES]

export type PostgresFailureSource =
  | 'sqlstate'
  | 'transport_connect'
  | 'transport_ambiguous'
  | 'pool_timeout'

export interface PostgresErrorClassification {
  readonly sqlState: SupportedPostgresSqlState | null
  readonly source: PostgresFailureSource
  readonly status: number
  readonly code: ErrorCode
  readonly category: AppErrorCategory
  readonly safeMessage: string
  readonly retryable: boolean
  readonly shouldReport: boolean
}

interface ErrorRecord {
  readonly code?: unknown
  readonly name?: unknown
  readonly message?: unknown
  readonly stack?: unknown
  readonly syscall?: unknown
  readonly cause?: unknown
  readonly original?: unknown
  readonly driverError?: unknown
}

function databaseUnavailable(
  sqlState: SupportedPostgresSqlState,
  retryable = true,
  code: ErrorCode = ErrorCode.DATABASE_UNAVAILABLE
): PostgresErrorClassification {
  return {
    sqlState,
    source: 'sqlstate',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code,
    category: 'dependency',
    safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    retryable,
    shouldReport: true,
  }
}

const CLASSIFICATIONS: Record<SupportedPostgresSqlState, PostgresErrorClassification> = {
  [POSTGRES_SQL_STATES.CONNECTION_EXCEPTION]: databaseUnavailable(
    POSTGRES_SQL_STATES.CONNECTION_EXCEPTION
  ),
  [POSTGRES_SQL_STATES.SQLCLIENT_UNABLE_TO_ESTABLISH_CONNECTION]: databaseUnavailable(
    POSTGRES_SQL_STATES.SQLCLIENT_UNABLE_TO_ESTABLISH_CONNECTION
  ),
  [POSTGRES_SQL_STATES.CONNECTION_DOES_NOT_EXIST]: databaseUnavailable(
    POSTGRES_SQL_STATES.CONNECTION_DOES_NOT_EXIST
  ),
  [POSTGRES_SQL_STATES.SERVER_REJECTED_CONNECTION]: databaseUnavailable(
    POSTGRES_SQL_STATES.SERVER_REJECTED_CONNECTION
  ),
  [POSTGRES_SQL_STATES.CONNECTION_FAILURE]: databaseUnavailable(
    POSTGRES_SQL_STATES.CONNECTION_FAILURE
  ),
  [POSTGRES_SQL_STATES.TRANSACTION_RESOLUTION_UNKNOWN]: databaseUnavailable(
    POSTGRES_SQL_STATES.TRANSACTION_RESOLUTION_UNKNOWN,
    false,
    ErrorCode.DATABASE_OUTCOME_UNKNOWN
  ),
  [POSTGRES_SQL_STATES.PROTOCOL_VIOLATION]: databaseUnavailable(
    POSTGRES_SQL_STATES.PROTOCOL_VIOLATION,
    false
  ),
  [POSTGRES_SQL_STATES.UNIQUE_VIOLATION]: {
    sqlState: POSTGRES_SQL_STATES.UNIQUE_VIOLATION,
    source: 'sqlstate',
    status: HttpStatus.CONFLICT,
    code: ErrorCode.DATABASE_UNIQUE_CONFLICT,
    category: 'conflict',
    safeMessage: ErrorMessages.DUPLICATE_ENTRY,
    retryable: false,
    shouldReport: false,
  },
  [POSTGRES_SQL_STATES.FOREIGN_KEY_VIOLATION]: {
    sqlState: POSTGRES_SQL_STATES.FOREIGN_KEY_VIOLATION,
    source: 'sqlstate',
    status: HttpStatus.CONFLICT,
    code: ErrorCode.DATABASE_REFERENCE_CONFLICT,
    category: 'conflict',
    safeMessage: ErrorMessages.REFERENCE_CONFLICT,
    retryable: false,
    shouldReport: false,
  },
  [POSTGRES_SQL_STATES.CHECK_VIOLATION]: {
    sqlState: POSTGRES_SQL_STATES.CHECK_VIOLATION,
    source: 'sqlstate',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: ErrorCode.DATABASE_CHECK_VIOLATION,
    category: 'validation',
    safeMessage: ErrorMessages.DATABASE_CHECK_VIOLATION,
    retryable: false,
    shouldReport: false,
  },
  [POSTGRES_SQL_STATES.DISK_FULL]: {
    sqlState: POSTGRES_SQL_STATES.DISK_FULL,
    source: 'sqlstate',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: ErrorCode.DATABASE_RESOURCE_EXHAUSTED,
    category: 'dependency',
    safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    retryable: false,
    shouldReport: true,
  },
  [POSTGRES_SQL_STATES.OUT_OF_MEMORY]: {
    sqlState: POSTGRES_SQL_STATES.OUT_OF_MEMORY,
    source: 'sqlstate',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: ErrorCode.DATABASE_RESOURCE_EXHAUSTED,
    category: 'dependency',
    safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    retryable: false,
    shouldReport: true,
  },
  [POSTGRES_SQL_STATES.SERIALIZATION_FAILURE]: {
    sqlState: POSTGRES_SQL_STATES.SERIALIZATION_FAILURE,
    source: 'sqlstate',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: ErrorCode.DATABASE_SERIALIZATION_FAILURE,
    category: 'dependency',
    safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    retryable: true,
    shouldReport: true,
  },
  [POSTGRES_SQL_STATES.DEADLOCK_DETECTED]: {
    sqlState: POSTGRES_SQL_STATES.DEADLOCK_DETECTED,
    source: 'sqlstate',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: ErrorCode.DATABASE_DEADLOCK,
    category: 'dependency',
    safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    retryable: true,
    shouldReport: true,
  },
  [POSTGRES_SQL_STATES.LOCK_NOT_AVAILABLE]: {
    sqlState: POSTGRES_SQL_STATES.LOCK_NOT_AVAILABLE,
    source: 'sqlstate',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: ErrorCode.DATABASE_LOCK_TIMEOUT,
    category: 'dependency',
    safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    retryable: true,
    shouldReport: true,
  },
  [POSTGRES_SQL_STATES.TOO_MANY_CONNECTIONS]: databaseUnavailable(
    POSTGRES_SQL_STATES.TOO_MANY_CONNECTIONS
  ),
  [POSTGRES_SQL_STATES.CONFIGURATION_LIMIT_EXCEEDED]: {
    sqlState: POSTGRES_SQL_STATES.CONFIGURATION_LIMIT_EXCEEDED,
    source: 'sqlstate',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: ErrorCode.DATABASE_RESOURCE_EXHAUSTED,
    category: 'dependency',
    safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    retryable: false,
    shouldReport: true,
  },
  [POSTGRES_SQL_STATES.QUERY_CANCELED]: {
    sqlState: POSTGRES_SQL_STATES.QUERY_CANCELED,
    source: 'sqlstate',
    status: HttpStatus.GATEWAY_TIMEOUT,
    code: ErrorCode.DATABASE_QUERY_TIMEOUT,
    category: 'dependency',
    safeMessage: ErrorMessages.GATEWAY_TIMEOUT,
    retryable: true,
    shouldReport: true,
  },
  [POSTGRES_SQL_STATES.ADMIN_SHUTDOWN]: databaseUnavailable(POSTGRES_SQL_STATES.ADMIN_SHUTDOWN),
  [POSTGRES_SQL_STATES.CRASH_SHUTDOWN]: databaseUnavailable(POSTGRES_SQL_STATES.CRASH_SHUTDOWN),
  [POSTGRES_SQL_STATES.CANNOT_CONNECT_NOW]: databaseUnavailable(
    POSTGRES_SQL_STATES.CANNOT_CONNECT_NOW
  ),
}

function isRecord(value: unknown): value is ErrorRecord {
  return typeof value === 'object' && value !== null
}

function readErrorProperty(error: ErrorRecord, property: keyof ErrorRecord): unknown {
  try {
    return error[property]
  } catch {
    return undefined
  }
}

function findSqlState(error: unknown): SupportedPostgresSqlState | null {
  let current = error
  const visited = new Set<unknown>()

  for (let depth = 0; depth < 4 && isRecord(current) && !visited.has(current); depth += 1) {
    visited.add(current)

    const code = readErrorProperty(current, 'code')
    if (typeof code === 'string' && code in CLASSIFICATIONS) {
      return code as SupportedPostgresSqlState
    }

    current =
      readErrorProperty(current, 'cause') ??
      readErrorProperty(current, 'original') ??
      readErrorProperty(current, 'driverError')
  }

  return null
}

const CONNECT_FAILURE_CODES = new Set(['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH'])
const AMBIGUOUS_TRANSPORT_CODES = new Set(['ECONNRESET', 'EPIPE'])
const POSTGRES_STACK_MARKERS = [
  'node_modules/pg/',
  'node_modules/pg-pool/',
  'node_modules/knex/',
  'node_modules/@adonisjs/lucid/',
]

function chainHasPostgresMarker(error: unknown): boolean {
  let current = error
  const visited = new Set<unknown>()

  for (let depth = 0; depth < 4 && isRecord(current) && !visited.has(current); depth += 1) {
    visited.add(current)
    const stack = readErrorProperty(current, 'stack')
    if (
      typeof stack === 'string' &&
      POSTGRES_STACK_MARKERS.some((marker) => stack.includes(marker))
    ) {
      return true
    }
    current =
      readErrorProperty(current, 'cause') ??
      readErrorProperty(current, 'original') ??
      readErrorProperty(current, 'driverError')
  }

  return false
}

function runtimeDatabaseUnavailable(
  source: Exclude<PostgresFailureSource, 'sqlstate'>,
  retryable: boolean,
  code: ErrorCode = ErrorCode.DATABASE_UNAVAILABLE
): PostgresErrorClassification {
  return {
    sqlState: null,
    source,
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code,
    category: 'dependency',
    safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    retryable,
    shouldReport: true,
  }
}

function classifyRuntimePostgresFailure(error: unknown): PostgresErrorClassification | null {
  let current = error
  const visited = new Set<unknown>()
  const hasDriverMarker = chainHasPostgresMarker(error)

  for (let depth = 0; depth < 4 && isRecord(current) && !visited.has(current); depth += 1) {
    visited.add(current)
    const name = readErrorProperty(current, 'name')
    const message = readErrorProperty(current, 'message')
    if (
      name === 'KnexTimeoutError' ||
      (typeof message === 'string' && message.startsWith('Knex: Timeout acquiring a connection'))
    ) {
      return runtimeDatabaseUnavailable('pool_timeout', true)
    }

    const code = readErrorProperty(current, 'code')
    const syscall = readErrorProperty(current, 'syscall')
    if (hasDriverMarker && typeof code === 'string') {
      if (CONNECT_FAILURE_CODES.has(code) || (code === 'ETIMEDOUT' && syscall === 'connect')) {
        return runtimeDatabaseUnavailable('transport_connect', true)
      }
      if (AMBIGUOUS_TRANSPORT_CODES.has(code) || (code === 'ETIMEDOUT' && syscall !== 'connect')) {
        return runtimeDatabaseUnavailable(
          'transport_ambiguous',
          false,
          ErrorCode.DATABASE_OUTCOME_UNKNOWN
        )
      }
    }

    current =
      readErrorProperty(current, 'cause') ??
      readErrorProperty(current, 'original') ??
      readErrorProperty(current, 'driverError')
  }

  return null
}

export function classifyPostgresError(error: unknown): PostgresErrorClassification | null {
  const sqlState = findSqlState(error)
  return sqlState === null ? classifyRuntimePostgresFailure(error) : CLASSIFICATIONS[sqlState]
}
