import { test } from '@japa/runner'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

test.group('Unit | PersistedDataIntegrityException', () => {
  test('is reportable, non-retryable, and safe at the HTTP boundary', ({ assert }) => {
    const error = new PersistedDataIntegrityException('Internal storage contract detail', {
      table: 'tasks',
      field: 'tech_stack',
      reason: 'unexpected_shape',
    })

    assert.equal(error.status, 500)
    assert.equal(error.code, 'E_PERSISTED_DATA_INTEGRITY')
    assert.equal(error.category, 'internal')
    assert.isFalse(error.retryable)
    assert.isTrue(error.shouldReport)
    assert.notEqual(error.safeMessage, error.message)
    assert.deepEqual(error.details, {
      table: 'tasks',
      field: 'tech_stack',
      reason: 'unexpected_shape',
    })
  })
})
