import { test } from '@japa/runner'

import {
  normalizeTaskVerificationMethod,
  parseTaskVerificationMethods,
  taskVerificationMethodRequiresEvidence,
} from '#modules/tasks/domain/task-authoring/task_verification_methods'

test.group('Task verification methods', () => {
  test('normalizes multi-select and custom verification methods into one persisted string', ({
    assert,
  }) => {
    const normalized = normalizeTaskVerificationMethod(
      'Code review\nmanual_qa\ncustom:Pair walkthrough with PM\nPair walkthrough with PM'
    )

    assert.equal(
      normalized,
      'code_review\nmanual_qa\ncustom:Pair walkthrough with PM'
    )

    assert.deepEqual(parseTaskVerificationMethods(normalized), {
      selectedValues: ['code_review', 'manual_qa'],
      customValues: ['Pair walkthrough with PM'],
    })
  })

  test('requires evidence when any selected verification method demands it', ({ assert }) => {
    assert.isTrue(taskVerificationMethodRequiresEvidence('code_review\nmanual_qa'))
    assert.isFalse(taskVerificationMethodRequiresEvidence('code_review\npeer_review'))
    assert.isFalse(taskVerificationMethodRequiresEvidence('custom:Manager shadow review'))
  })
})
