import { test } from '@japa/runner'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import { readTalentExplainabilityProjection } from '#modules/users/domain/profile/talent_explainability_projection'

test.group('Unit | Talent explainability summary integrity', () => {
  test('treats an absent projection as an intentional empty state', ({ assert }) => {
    assert.isNull(readTalentExplainabilityProjection(null, 'user-1'))
    assert.isNull(readTalentExplainabilityProjection({}, 'user-1'))
  })

  test('reads a valid persisted projection', ({ assert }) => {
    assert.deepEqual(
      readTalentExplainabilityProjection(
        {
          talent_explainability_v1: {
            contract_version: 1,
            under_dispute_skills_count: 2,
            latest_confidence_signal: 'high',
            source_revision: '42',
            projected_at: '2026-07-26T00:00:00.000Z',
          },
        },
        'user-1'
      ),
      {
        contract_version: 1,
        under_dispute_skills_count: 2,
        latest_confidence_signal: 'high',
        source_revision: '42',
        projected_at: '2026-07-26T00:00:00.000Z',
      }
    )
  })

  test('rejects malformed JSON instead of presenting it as missing data', ({ assert }) => {
    let thrown: unknown

    try {
      readTalentExplainabilityProjection('{not-json', 'user-1')
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, PersistedDataIntegrityException)
    assert.deepInclude((thrown as PersistedDataIntegrityException).details, {
      table: 'users',
      field: 'trust_data.talent_explainability_v1',
      record_id: 'user-1',
      reason: 'invalid_json',
    })
  })

  test('rejects an invalid persisted projection contract', ({ assert }) => {
    assert.throws(
      () =>
        readTalentExplainabilityProjection(
          {
            talent_explainability_v1: {
              contract_version: 1,
              under_dispute_skills_count: -1,
              latest_confidence_signal: 'unknown',
              source_revision: 'revision-1',
              projected_at: 'not-a-date',
            },
          },
          'user-1'
        ),
      PersistedDataIntegrityException
    )
  })
})
