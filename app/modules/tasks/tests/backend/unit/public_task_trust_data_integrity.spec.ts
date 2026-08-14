import { test } from '@japa/runner'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import { parsePersistedTaskRecommendationTrustData } from '#modules/tasks/infra/repositories/task-reading/read/public_queries'

test.group('Public task recommendation trust-data integrity', () => {
  test('accepts absent and valid persisted trust data', ({ assert }) => {
    assert.deepEqual(parsePersistedTaskRecommendationTrustData(null, 'user-1'), {})
    assert.deepEqual(
      parsePersistedTaskRecommendationTrustData('{"calculated_score":82}', 'user-1'),
      { calculated_score: 82 }
    )
  })

  test('rejects malformed persisted JSON instead of silently assigning zero trust', ({
    assert,
  }) => {
    let thrown: unknown
    try {
      parsePersistedTaskRecommendationTrustData('{not-json', 'user-1')
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, PersistedDataIntegrityException)
    assert.deepInclude((thrown as PersistedDataIntegrityException).details, {
      table: 'users',
      field: 'trust_data',
      record_id: 'user-1',
      reason: 'invalid_json',
    })
  })

  test('rejects invalid shapes and score types', ({ assert }) => {
    assert.throws(
      () => parsePersistedTaskRecommendationTrustData([], 'user-1'),
      PersistedDataIntegrityException
    )
    assert.throws(
      () =>
        parsePersistedTaskRecommendationTrustData(
          { calculated_score: '82' },
          'user-1'
        ),
      PersistedDataIntegrityException
    )
  })
})
