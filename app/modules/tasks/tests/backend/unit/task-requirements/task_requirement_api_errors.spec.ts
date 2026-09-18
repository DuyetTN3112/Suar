import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import {
  throwHttpBoundaryError,
  throwHttpValidationError,
} from '#modules/http/boundary/http_boundary_errors'

test.group('Task requirement API errors', () => {
  test('preserves trusted typed application exceptions', ({ assert }) => {
    const error = new ConflictException('Skill already required in this task')
    let thrown: unknown

    try {
      throwHttpBoundaryError(error)
    } catch (cause) {
      thrown = cause
    }

    assert.strictEqual(thrown, error)
  })

  test('does not promote an untrusted matching message into a client-safe exception', ({
    assert,
  }) => {
    const error = new Error('Skill already required in this task')
    let thrown: unknown

    try {
      throwHttpBoundaryError(error)
    } catch (cause) {
      thrown = cause
    }

    assert.strictEqual(thrown, error)
  })

  test('normalizes Vine messages as a typed validation exception', ({ assert }) => {
    assert.throws(
      () =>
        throwHttpValidationError({
          messages: [{ field: 'weight', message: 'The weight must be positive' }],
        }),
      'The weight must be positive'
    )
  })
})
