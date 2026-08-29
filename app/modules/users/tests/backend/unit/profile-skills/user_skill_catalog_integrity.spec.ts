import { test } from '@japa/runner'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import { assertUserSkillCatalogFactsComplete } from '#modules/users/infra/adapters/profile-skills/user_skill_catalog_integrity'

test.group('Unit | User skill catalog integrity', () => {
  test('accepts a complete catalog projection regardless of ordering or duplicate rows', ({
    assert,
  }) => {
    assert.doesNotThrow(() =>
      assertUserSkillCatalogFactsComplete(
        'user-1',
        ['skill-2', 'skill-1', 'skill-1'],
        ['skill-1', 'skill-2']
      )
    )
  })

  test('rejects a persisted user skill whose catalog fact is missing', ({ assert }) => {
    let thrown: unknown

    try {
      assertUserSkillCatalogFactsComplete(
        'user-1',
        ['skill-present', 'skill-missing'],
        ['skill-present']
      )
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, PersistedDataIntegrityException)
    assert.equal(
      (thrown as PersistedDataIntegrityException).code,
      'E_PERSISTED_DATA_INTEGRITY'
    )
    assert.deepInclude((thrown as PersistedDataIntegrityException).details, {
      table: 'user_skills',
      relation: 'skills',
      record_id: 'user-1',
      missing_fact_count: 1,
      reason: 'missing_catalog_fact',
    })
  })
})
