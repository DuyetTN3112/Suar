import { test } from '@japa/runner'

import { projectAccomplishmentTaxonomy } from '#modules/accomplishments/domain/verified-work/accomplishment_taxonomy_projection'
import { TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE } from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'

test.group('accomplishment taxonomy projection', () => {
  test('keeps canonical task metadata distinct and multi-valued', ({ assert }) => {
    const projected = projectAccomplishmentTaxonomy({
      ...TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE,
      taxonomyMetadata: {
        schemaVersion: 'suar.task_assignment_taxonomy_metadata.v1',
        entityId: TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.taskId,
        sourceRevision: 'sha256:task-source',
        projectedAt: '2026-08-09T00:00:00.000Z',
        assignments: [
          {
            resource: 'task',
            entityId: TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.taskId,
            term: { namespace: 'technologies', termId: 'postgresql' },
            provenance: 'explicit',
            reviewState: 'reviewed',
            sourceType: 'task.tech_stack',
            taxonomyVersion: 3,
          },
          {
            resource: 'task',
            entityId: TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.taskId,
            term: { namespace: 'technologies', termId: 'typescript' },
            provenance: 'explicit',
            reviewState: 'reviewed',
            sourceType: 'task.tech_stack',
            taxonomyVersion: 3,
          },
          {
            resource: 'task',
            entityId: TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.taskId,
            term: { namespace: 'task-types', termId: 'feature_development' },
            provenance: 'explicit',
            reviewState: 'reviewed',
            sourceType: 'task.task_type',
            taxonomyVersion: 3,
          },
        ],
        freeFormTags: [],
        taxonomyVersions: { technologies: 3, 'task-types': 3 },
        diagnostics: [],
        completeness: [],
        providerVersions: null,
      },
    }, {
      factors: ['cross-service', 'consistency'],
      novelty: 'new-domain',
      risk: 'high',
    })

    assert.equal(projected.taskType, 'feature_development')
    assert.deepEqual(projected.technology, ['postgresql', 'typescript'])
    assert.isNull(projected.businessDomain)
    assert.isNull(projected.problemCategory)
    assert.deepEqual(projected.complexity, {
      summary: null,
      factors: ['cross-service', 'consistency'],
      novelty: 'new-domain',
      risk: 'high',
    })
  })

  test('returns unavailable taxonomy as empty/null without inventing labels', ({ assert }) => {
    const projected = projectAccomplishmentTaxonomy(TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE)

    assert.isNull(projected.taskType)
    assert.isNull(projected.businessDomain)
    assert.isNull(projected.problemCategory)
    assert.deepEqual(projected.technology, [])
    assert.deepEqual(projected.complexity, {
      summary: null,
      factors: [],
      novelty: null,
      risk: null,
    })
  })
})
