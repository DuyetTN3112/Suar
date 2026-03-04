import { test } from '@japa/runner'

import {
  classifyPostgresError,
  POSTGRES_SQL_STATES,
} from '#modules/errors/public_contracts/postgres_error_classifier'
import PostgresException from '#modules/errors/public_contracts/postgres_exception'

test.group('PostgreSQL error classifier', () => {
  test('fails closed when a hostile thrown object traps diagnostic property reads', ({
    assert,
  }) => {
    const hostileError = new Proxy(
      {},
      {
        get() {
          throw new Error('hostile getter')
        },
      }
    )

    assert.isNull(classifyPostgresError(hostileError))
  })

  test('maps constraint SQLSTATEs to stable client failures', ({ assert }) => {
    const unique = classifyPostgresError({ code: POSTGRES_SQL_STATES.UNIQUE_VIOLATION })
    const foreignKey = classifyPostgresError({
      code: POSTGRES_SQL_STATES.FOREIGN_KEY_VIOLATION,
    })
    const check = classifyPostgresError({ code: POSTGRES_SQL_STATES.CHECK_VIOLATION })

    assert.deepInclude(unique, {
      status: 409,
      code: 'E_DATABASE_UNIQUE_CONFLICT',
      retryable: false,
      shouldReport: false,
    })
    assert.deepInclude(foreignKey, {
      status: 409,
      code: 'E_DATABASE_REFERENCE_CONFLICT',
      retryable: false,
    })
    assert.deepInclude(check, {
      status: 422,
      code: 'E_DATABASE_CHECK_VIOLATION',
      retryable: false,
    })
  })

  test('marks serialization, deadlock, and lock timeout failures retryable', ({ assert }) => {
    const serialization = classifyPostgresError({
      cause: {
        code: POSTGRES_SQL_STATES.SERIALIZATION_FAILURE,
      },
    })
    const deadlock = classifyPostgresError({
      original: {
        code: POSTGRES_SQL_STATES.DEADLOCK_DETECTED,
      },
    })
    const lockTimeout = classifyPostgresError({
      driverError: {
        code: POSTGRES_SQL_STATES.LOCK_NOT_AVAILABLE,
      },
    })

    assert.deepInclude(serialization, {
      status: 503,
      code: 'E_DATABASE_SERIALIZATION_FAILURE',
      retryable: true,
      shouldReport: true,
    })
    assert.deepInclude(deadlock, {
      status: 503,
      code: 'E_DATABASE_DEADLOCK',
      retryable: true,
      shouldReport: true,
    })
    assert.deepInclude(lockTimeout, {
      status: 503,
      code: 'E_DATABASE_LOCK_TIMEOUT',
      retryable: true,
      shouldReport: true,
    })
  })

  test('maps transient PostgreSQL availability SQLSTATEs to retryable 503 failures', ({
    assert,
  }) => {
    const sqlStates = [
      POSTGRES_SQL_STATES.CONNECTION_EXCEPTION,
      POSTGRES_SQL_STATES.SQLCLIENT_UNABLE_TO_ESTABLISH_CONNECTION,
      POSTGRES_SQL_STATES.CONNECTION_DOES_NOT_EXIST,
      POSTGRES_SQL_STATES.SERVER_REJECTED_CONNECTION,
      POSTGRES_SQL_STATES.CONNECTION_FAILURE,
      POSTGRES_SQL_STATES.TOO_MANY_CONNECTIONS,
      POSTGRES_SQL_STATES.ADMIN_SHUTDOWN,
      POSTGRES_SQL_STATES.CRASH_SHUTDOWN,
      POSTGRES_SQL_STATES.CANNOT_CONNECT_NOW,
    ]

    for (const sqlState of sqlStates) {
      assert.deepInclude(classifyPostgresError({ driverError: { code: sqlState } }), {
        sqlState,
        source: 'sqlstate',
        status: 503,
        code: 'E_DATABASE_UNAVAILABLE',
        category: 'dependency',
        retryable: true,
        shouldReport: true,
      })
    }
  })

  test('does not recommend blind retries when transaction outcome is unknown', ({ assert }) => {
    for (const sqlState of [POSTGRES_SQL_STATES.PROTOCOL_VIOLATION]) {
      assert.deepInclude(classifyPostgresError({ code: sqlState }), {
        status: 503,
        code: 'E_DATABASE_UNAVAILABLE',
        category: 'dependency',
        retryable: false,
        shouldReport: true,
      })
    }

    assert.deepInclude(
      classifyPostgresError({
        code: POSTGRES_SQL_STATES.TRANSACTION_RESOLUTION_UNKNOWN,
      }),
      {
        status: 503,
        code: 'E_DATABASE_OUTCOME_UNKNOWN',
        retryable: false,
      }
    )
  })

  test('classifies bounded query and resource failures without blind retry advice', ({
    assert,
  }) => {
    assert.deepInclude(classifyPostgresError({ code: POSTGRES_SQL_STATES.QUERY_CANCELED }), {
      status: 504,
      code: 'E_DATABASE_QUERY_TIMEOUT',
      retryable: true,
    })

    for (const sqlState of [
      POSTGRES_SQL_STATES.DISK_FULL,
      POSTGRES_SQL_STATES.OUT_OF_MEMORY,
      POSTGRES_SQL_STATES.CONFIGURATION_LIMIT_EXCEEDED,
    ]) {
      assert.deepInclude(classifyPostgresError({ code: sqlState }), {
        status: 503,
        code: 'E_DATABASE_RESOURCE_EXHAUSTED',
        retryable: false,
      })
    }
  })

  test('recognizes PostgreSQL transport and pool failures without stealing other dependencies', ({
    assert,
  }) => {
    const connectFailure = Object.assign(new Error('connect ECONNREFUSED'), {
      code: 'ECONNREFUSED',
      syscall: 'connect',
      stack: 'Error: connect ECONNREFUSED\n at node_modules/pg-pool/index.js:45:11',
    })
    const ambiguousFailure = Object.assign(new Error('socket reset'), {
      code: 'ECONNRESET',
      stack: 'Error: socket reset\n at node_modules/pg/lib/client.js:500:11',
    })
    const unrelatedRedisFailure = Object.assign(new Error('connect ECONNREFUSED'), {
      code: 'ECONNREFUSED',
      syscall: 'connect',
      stack: 'Error: connect ECONNREFUSED\n at node_modules/ioredis/built/Redis.js:100:5',
    })

    assert.deepInclude(classifyPostgresError(connectFailure), {
      sqlState: null,
      source: 'transport_connect',
      code: 'E_DATABASE_UNAVAILABLE',
      retryable: true,
    })
    assert.deepInclude(classifyPostgresError(ambiguousFailure), {
      sqlState: null,
      source: 'transport_ambiguous',
      code: 'E_DATABASE_OUTCOME_UNKNOWN',
      retryable: false,
    })
    assert.deepInclude(
      classifyPostgresError({
        name: 'KnexTimeoutError',
        message: 'Knex: Timeout acquiring a connection. The pool is probably full.',
      }),
      {
        source: 'pool_timeout',
        code: 'E_DATABASE_UNAVAILABLE',
        retryable: true,
      }
    )
    assert.isNull(classifyPostgresError(unrelatedRedisFailure))
  })

  test('does not classify unrelated or excessively nested errors', ({ assert }) => {
    assert.isNull(classifyPostgresError({ code: 'E_NOT_FOUND' }))
    assert.isNull(
      classifyPostgresError({ cause: { cause: { cause: { cause: { code: '23505' } } } } })
    )
    assert.isNull(classifyPostgresError('23505'))
  })

  test('wraps classified failures without exposing database diagnostics as safe text', ({
    assert,
  }) => {
    const cause = Object.assign(
      new Error('duplicate key value violates users_email_key; token=super-secret'),
      { code: '23505' }
    )
    const error = PostgresException.from(cause)

    assert.isTrue(error instanceof PostgresException)
    assert.equal(error?.status, 409)
    assert.equal(error?.code, 'E_DATABASE_UNIQUE_CONFLICT')
    assert.equal(error?.safeMessage, 'Dữ liệu bị trùng lặp')
    assert.equal(error?.cause, cause)
    assert.notInclude(error?.safeMessage ?? '', 'users_email_key')
  })
})
