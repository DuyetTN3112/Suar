import { test } from '@japa/runner'

import AppException from '#modules/errors/public_contracts/application_exception'
import {
  databaseValueExists,
  ValidationDatabaseException,
} from '#modules/errors/public_contracts/database_validation'
import { ErrorCode, ErrorMessages } from '#modules/errors/public_contracts/error_constants'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

function fakeDatabase(first: () => Promise<unknown>) {
  const query = {
    where() {
      return query
    },
    whereNull() {
      return query
    },
    select() {
      return query
    },
    first,
  }

  return {
    from() {
      return query
    },
  }
}

async function captureRejection(executor: () => Promise<unknown>): Promise<unknown> {
  try {
    await executor()
  } catch (error) {
    return error
  }

  throw new TypeError('Expected promise to reject')
}

test.group('Database validation exception semantics', () => {
  test('treats an absent row as a validation miss', async ({ assert }) => {
    const exists = await databaseValueExists(
      fakeDatabase(() => Promise.resolve(undefined)),
      'organizations',
      'id',
      VALID_UUID,
      {
        operation: 'organization_validation.exists',
        softDelete: true,
      }
    )

    assert.isFalse(exists)
  })

  test('preserves a typed application failure unchanged', async ({ assert }) => {
    const typedFailure = new AppException('Known dependency failure', {
      status: 503,
      code: ErrorCode.SERVICE_UNAVAILABLE,
      safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    })
    const error = await captureRejection(() =>
      databaseValueExists(
        fakeDatabase(() => Promise.reject(typedFailure)),
        'projects',
        'id',
        VALID_UUID,
        { operation: 'project_validation.exists' }
      )
    )

    assert.strictEqual(error, typedFailure)
  })

  test('maps a driver outage to a retryable sanitized dependency failure', async ({ assert }) => {
    const diagnostic = 'connect ECONNREFUSED postgres://admin:secret@database/users'
    const error = await captureRejection(() =>
      databaseValueExists(
        fakeDatabase(() => Promise.reject(new Error(diagnostic))),
        'users',
        'id',
        VALID_UUID,
        { operation: 'user_validation.exists', softDelete: true }
      )
    )

    assert.instanceOf(error, ValidationDatabaseException)
    if (!(error instanceof ValidationDatabaseException)) {
      throw new TypeError('Expected ValidationDatabaseException')
    }
    assert.equal(error.status, 503)
    assert.equal(error.code, ErrorCode.SERVICE_UNAVAILABLE)
    assert.isTrue(error.retryable)
    assert.equal(error.safeMessage, ErrorMessages.SERVICE_UNAVAILABLE)
    assert.notInclude(error.message, 'secret')
    assert.equal(error.details?.['operation'], 'user_validation.exists')
    assert.equal((error.cause as Error).message, diagnostic)
  })
})
