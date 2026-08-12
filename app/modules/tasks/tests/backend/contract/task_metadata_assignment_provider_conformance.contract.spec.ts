import { test } from '@japa/runner'

import type {
  TaskMetadataAssignmentSourceReader,
  TaskMetadataEntitySource,
} from '#modules/tasks/actions/ports/outbound/task_metadata_assignment_source_reader'
import { TaskMetadataAssignmentProvider } from '#modules/tasks/infra/adapters/task-assignment/task_metadata_assignment_provider'
import { validateTaxonomyAssignment } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_assignment'
import { normalizeFreeFormTag } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_term'
import { assertMetadataAssignmentProviderConformance } from '#modules/taxonomy/tests/backend/contract/taxonomy-governance/metadata_assignment_provider_conformance'

function conformanceSource(): TaskMetadataEntitySource {
  return {
    entityId: 'task-conformance',
    organizationId: 'org-a',
    visibility: 'external',
    deleted: false,
    sourceRevision: 'source-19',
    projectedAt: '2026-08-01T00:00:00.000Z',
    namespaces: [
      {
        namespace: 'skills',
        state: 'known_present',
        taxonomyVersion: 19,
        assignments: [
          {
            termId: 'skill-a',
            provenance: 'explicit',
            reviewState: 'reviewed',
            sourceType: 'task_required_skill',
          },
          {
            termId: 'skill-b',
            provenance: 'derived',
            reviewState: 'pending',
            confidence: 0.72,
            sourceType: 'professional_role_prefill',
            enrichmentVersion: 4,
          },
        ],
      },
    ],
    freeFormTags: [
      { value: 'Multi label', tagSpace: 'task.domain-tags', sourceType: 'task.domain_tags' },
    ],
  }
}

test.group('Contract | Task metadata assignment provider', () => {
  test('passes the shared metadata-assignment conformance harness', async ({ assert }) => {
    const source = conformanceSource()
    const hiddenSource: TaskMetadataEntitySource = {
      ...source,
      entityId: 'task-hidden',
      visibility: 'internal',
    }
    const reader: TaskMetadataAssignmentSourceReader = {
      loadVisibleTaskMetadata: () => Promise.resolve([source, hiddenSource]),
    }
    const provider = new TaskMetadataAssignmentProvider(reader)
    const expectedFreeFormTags = [
      normalizeFreeFormTag('Multi label', {
        resource: 'task',
        entityId: source.entityId,
        tagSpace: 'task.domain-tags',
        sourceType: 'task.domain_tags',
      }),
    ]

    const report = await assertMetadataAssignmentProviderConformance({
      provider,
      authorizedQuery: { resource: 'task', entityIds: [source.entityId] },
      hiddenQuery: { resource: 'task', entityIds: [hiddenSource.entityId] },
      unknownQuery: { resource: 'task', entityIds: ['task-unknown'] },
      wrongResourceQuery: { resource: 'project', entityIds: [source.entityId] },
      unknownNamespaceQuery: {
        resource: 'task',
        entityIds: [source.entityId],
        namespaces: ['organization.private-vocabulary'],
      },
      authorizedResult: {
        assignments: [
          {
            resource: 'task',
            entityId: source.entityId,
            term: { namespace: 'skills', termId: 'skill-a' },
            provenance: 'explicit',
            reviewState: 'reviewed',
            sourceType: 'task_required_skill',
            taxonomyVersion: 19,
          },
          {
            resource: 'task',
            entityId: source.entityId,
            term: { namespace: 'skills', termId: 'skill-b' },
            provenance: 'derived',
            reviewState: 'pending',
            confidence: 0.72,
            sourceType: 'professional_role_prefill',
            enrichmentVersion: 4,
            taxonomyVersion: 19,
          },
        ],
        freeFormTags: expectedFreeFormTags,
        taxonomyVersions: { skills: 19 },
        diagnostics: [],
      },
      emptyResult: {
        assignments: [],
        freeFormTags: [],
        taxonomyVersions: {},
        diagnostics: [],
      },
    })

    assert.equal(report.authorizedAssignmentCount, 2)
    assert.equal(report.authorizedTaxonomyNamespaceCount, 1)
  })

  test('conforms to WP-02 assignment envelopes and free-form normalization', async ({ assert }) => {
    const source = conformanceSource()
    const reader: TaskMetadataAssignmentSourceReader = {
      loadVisibleTaskMetadata: () => Promise.resolve([source]),
    }
    const provider = new TaskMetadataAssignmentProvider(reader)

    const result = await provider.getAssignments({ resource: 'task', entityIds: [source.entityId] })

    assert.isTrue(
      result.assignments.every((assignment) => validateTaxonomyAssignment(assignment).length === 0)
    )
    assert.deepEqual(result.freeFormTags, [
      normalizeFreeFormTag('Multi label', {
        resource: 'task',
        entityId: source.entityId,
        tagSpace: 'task.domain-tags',
        sourceType: 'task.domain_tags',
      }),
    ])
    assert.deepEqual(result.taxonomyVersions, { skills: 19 })
    assert.notProperty(result, 'total')
  })

  test('returns the same safe empty envelope for wrong resources, namespaces, and hidden probes', async ({
    assert,
  }) => {
    const source: TaskMetadataEntitySource = {
      ...conformanceSource(),
      visibility: 'internal',
    }
    const reader: TaskMetadataAssignmentSourceReader = {
      loadVisibleTaskMetadata: () => Promise.resolve([source]),
    }
    const provider = new TaskMetadataAssignmentProvider(reader)

    const hidden = await provider.getAssignments({ resource: 'task', entityIds: [source.entityId] })
    const unknown = await provider.getAssignments({ resource: 'task', entityIds: ['unknown'] })
    const wrongResource = await provider.getAssignments({
      resource: 'project',
      entityIds: [source.entityId],
    })
    const wrongNamespace = await provider.getAssignments({
      resource: 'task',
      entityIds: [source.entityId],
      namespaces: ['organization.private-vocabulary'],
    })

    assert.deepEqual(hidden, unknown)
    assert.deepEqual(unknown, wrongResource)
    assert.deepEqual(wrongResource, wrongNamespace)
    assert.notInclude(JSON.stringify(hidden), 'skill-a')
    assert.notInclude(JSON.stringify(hidden), 'org-a')
  })
})
