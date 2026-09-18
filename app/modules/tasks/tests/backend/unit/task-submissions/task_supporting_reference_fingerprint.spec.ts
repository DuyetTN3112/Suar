import { test } from '@japa/runner'

import {
  taskSupportingReferenceFingerprint,
  taskSupportingReferenceUriHash,
} from '#modules/tasks/infra/repositories/task-authoring/task_supporting_reference_fingerprint'

test.group('Unit | Task Supporting Reference identity', () => {
  test('canonicalizes equivalent URL host/default-port spellings for lookup', ({ assert }) => {
    assert.equal(
      taskSupportingReferenceUriHash(' HTTPS://DOCS.EXAMPLE.TEST:443/api '),
      taskSupportingReferenceUriHash('https://docs.example.test/api')
    )
  })

  test('allows one URL to serve distinct relations or relevant sections', ({ assert }) => {
    const base = {
      uri: 'https://docs.example.test/pre-order',
      relation: 'requirement_source' as const,
      relevantSection: 'Lifecycle',
    }

    assert.notEqual(
      taskSupportingReferenceFingerprint(base),
      taskSupportingReferenceFingerprint({ ...base, relation: 'design_asset' })
    )
    assert.notEqual(
      taskSupportingReferenceFingerprint(base),
      taskSupportingReferenceFingerprint({ ...base, relevantSection: 'Failure cases' })
    )
  })

  test('gives exact semantic duplicates one fingerprint', ({ assert }) => {
    const base = {
      uri: 'https://docs.example.test/pre-order',
      relation: 'requirement_source' as const,
      relevantSection: ' Lifecycle ',
    }

    assert.equal(
      taskSupportingReferenceFingerprint(base),
      taskSupportingReferenceFingerprint({ ...base, relevantSection: 'Lifecycle' })
    )
  })
})
