import { test } from '@japa/runner'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { Result } from '#modules/errors/public_contracts/result'

test.group('Application Result contract', () => {
  test('preserves undefined as a successful value', ({ assert }) => {
    const result = Result.ok(undefined)

    assert.isTrue(result.isSuccess())
    assert.isUndefined(result.data)
    assert.isNull(result.error)
    assert.isUndefined(result.getValue())
  })

  test('preserves typed object failures without requiring Error inheritance', ({ assert }) => {
    const failure = { code: 'E_EXPECTED', reason: 'expected branch' }
    const result = Result.fail(failure)

    assert.isTrue(result.isFailure())
    assert.deepEqual(result.error, failure)
    assert.deepEqual(result.getError(), failure)
  })

  test('returns an Error failure through getError without changing its identity', ({ assert }) => {
    const failure = new Error('dependency failed')
    const result = Result.fail(failure)

    assert.strictEqual(result.getError(), failure)
  })

  test('rejects getValue on a non-Error failure with a typed invariant exception', ({ assert }) => {
    const result = Result.fail({ code: 'E_EXPECTED' })

    assert.throws(
      () => result.getValue(),
      InvariantViolationException,
      'Result contained a non-Error failure value'
    )
  })

  test('rejects getError on a successful result with a typed invariant exception', ({ assert }) => {
    const result = Result.ok('ok')

    assert.throws(
      () => result.getError(),
      InvariantViolationException,
      'Cannot get error from a successful Result'
    )
  })
})
