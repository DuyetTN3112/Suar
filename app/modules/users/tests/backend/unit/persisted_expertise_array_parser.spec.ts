import { test } from '@japa/runner'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import {
  parsePersistedObjectArray,
  parsePersistedStringArray,
} from '#modules/errors/public_contracts/persisted_json_array'

test.group('Unit | Persisted expertise array parser', () => {
  test('supports native and legacy serialized arrays', ({ assert }) => {
    assert.deepEqual(
      parsePersistedStringArray(['TypeScript'], {
        table: 'user_work_history',
        field: 'tech_stack',
        recordId: 'history-1',
      }),
      ['TypeScript']
    )
    assert.deepEqual(
      parsePersistedObjectArray('[{"skill_name":"TypeScript"}]', {
        table: 'user_work_history',
        field: 'skill_scores',
        recordId: 'history-1',
      }),
      [{ skill_name: 'TypeScript' }]
    )
  })

  test('fails closed on invalid JSON without retaining the raw value', ({ assert }) => {
    const secret = 'database-password-do-not-log'

    let thrown: unknown
    try {
      parsePersistedStringArray(secret, {
        table: 'user_work_history',
        field: 'domain_tags',
        recordId: 'history-2',
      })
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, PersistedDataIntegrityException)
    assert.notInclude(JSON.stringify(thrown), secret)
    assert.deepInclude((thrown as PersistedDataIntegrityException).details, {
      table: 'user_work_history',
      record_id: 'history-2',
      field: 'domain_tags',
      reason: 'invalid_json',
    })
  })

  test('fails closed on wrong containers and partially corrupt members', ({ assert }) => {
    let wrongContainerError: unknown
    try {
      parsePersistedStringArray(
        { unexpected: true },
        {
          table: 'user_work_history',
          field: 'tech_stack',
          recordId: 'history-3',
        }
      )
    } catch (error) {
      wrongContainerError = error
    }

    assert.instanceOf(wrongContainerError, PersistedDataIntegrityException)
    assert.equal(
      (wrongContainerError as PersistedDataIntegrityException).details?.['reason'],
      'unexpected_shape'
    )

    let invalidMemberError: unknown
    try {
      parsePersistedObjectArray([{ skill_name: 'TypeScript' }, null], {
        table: 'user_work_history',
        field: 'skill_scores',
        recordId: 'history-3',
      })
    } catch (error) {
      invalidMemberError = error
    }

    assert.instanceOf(invalidMemberError, PersistedDataIntegrityException)
    assert.deepInclude((invalidMemberError as PersistedDataIntegrityException).details, {
      reason: 'invalid_array_member',
      member_index: 1,
    })
  })
})
