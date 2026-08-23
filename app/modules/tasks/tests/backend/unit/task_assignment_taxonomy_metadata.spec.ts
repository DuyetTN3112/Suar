import { test } from '@japa/runner'

import { pinTaskAssignmentTaxonomyMetadata } from '#modules/tasks/domain/task-assignment/task_assignment_taxonomy_metadata'
import type { MetadataAssignmentResult } from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'

function result(overrides: Partial<MetadataAssignmentResult> = {}): MetadataAssignmentResult {
  return {
    assignments: [
      {
        resource: 'task',
        entityId: 'task-1',
        term: { namespace: 'task-types', termId: 'feature_development' },
        provenance: 'explicit',
        reviewState: 'reviewed',
        sourceType: 'task.task_type',
        taxonomyVersion: 7,
      },
    ],
    freeFormTags: [],
    taxonomyVersions: { 'task-types': 7 },
    diagnostics: [],
    completeness: [
      {
        resource: 'task',
        entityId: 'task-1',
        namespace: 'task-types',
        state: 'known_present',
        taxonomyVersion: 7,
        projectedAt: '2026-08-09T00:00:00.000Z',
        unresolvedCount: 0,
        belowThresholdCount: 0,
      },
    ],
    providerVersions: {
      assignmentSchemaVersion: 1,
      sourceRevisions: { 'task-1': 'sha256:task-source' },
      enrichmentVersions: {},
    },
    ...overrides,
  }
}

test.group('task assignment taxonomy metadata pinning', () => {
  test('pins the provider result with source and projection provenance', ({ assert }) => {
    const pinned = pinTaskAssignmentTaxonomyMetadata('task-1', result())

    assert.isNotNull(pinned)
    assert.equal(pinned?.schemaVersion, 'suar.task_assignment_taxonomy_metadata.v1')
    assert.equal(pinned?.entityId, 'task-1')
    assert.equal(pinned?.sourceRevision, 'sha256:task-source')
    assert.equal(pinned?.projectedAt, '2026-08-09T00:00:00.000Z')
    assert.deepEqual(pinned?.taxonomyVersions, { 'task-types': 7 })
  })

  test('fails closed when the provider leaks a different entity', ({ assert }) => {
    const assignment = result().assignments[0]
    if (!assignment) throw new Error('Taxonomy assignment fixture is missing')
    const pinned = pinTaskAssignmentTaxonomyMetadata(
      'task-1',
      result({
        assignments: [
          {
            ...assignment,
            entityId: 'task-2',
          },
        ],
      })
    )

    assert.isNull(pinned)
  })
})
