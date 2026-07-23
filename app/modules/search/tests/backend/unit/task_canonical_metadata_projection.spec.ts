import { test } from '@japa/runner'

import { projectTaskCanonicalMetadata } from '#modules/search/infra/adapters/entity-search/tasks/task_canonical_metadata_projection'
import type { MetadataAssignmentResult } from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'

function result(overrides: Partial<MetadataAssignmentResult> = {}): MetadataAssignmentResult {
  return {
    assignments: [
      {
        resource: 'task',
        entityId: 'task-1',
        term: { namespace: 'skills', termId: 'skill-typescript' },
        provenance: 'explicit',
        reviewState: 'reviewed',
        sourceType: 'task_required_skill',
        taxonomyVersion: 7,
      },
      {
        resource: 'task',
        entityId: 'task-1',
        term: { namespace: 'business-domains', termId: 'fintech' },
        provenance: 'derived',
        reviewState: 'pending',
        confidence: 0.8,
        sourceType: 'task.business_domain',
        taxonomyVersion: 2,
      },
    ],
    freeFormTags: [
      {
        resource: 'task',
        entityId: 'task-1',
        tagSpace: 'task.domain-tags',
        sourceType: 'task.domain_tags',
        displayValue: 'release-ready',
        normalizedValue: 'release-ready',
      },
    ],
    taxonomyVersions: { 'skills': 7, 'business-domains': 2 },
    diagnostics: [],
    completeness: [
      {
        resource: 'task',
        entityId: 'task-1',
        namespace: 'skills',
        state: 'known_present',
        taxonomyVersion: 7,
        projectedAt: '2026-08-01T00:00:00.000Z',
        unresolvedCount: 0,
        belowThresholdCount: 0,
      },
      {
        resource: 'task',
        entityId: 'task-1',
        namespace: 'business-domains',
        state: 'known_absent',
        taxonomyVersion: 2,
        projectedAt: '2026-08-01T00:00:00.000Z',
        unresolvedCount: 1,
        belowThresholdCount: 2,
      },
    ],
    providerVersions: {
      assignmentSchemaVersion: 3,
      sourceRevisions: { 'task-1': 'sha256:abc' },
      enrichmentVersions: { skills: 11 },
    },
    ...overrides,
  }
}

test.group('Unit | Task canonical metadata projection', () => {
  test('preserves canonical refs, namespace partitions, provenance, review, and versions', ({
    assert,
  }) => {
    assert.deepEqual(projectTaskCanonicalMetadata(result()), {
      canonical_term_ids: ['skills:skill-typescript', 'business-domains:fintech'],
      canonical_term_ids_known: true,
      canonical_term_ids_count: 2,
      canonical_term_ids_by_namespace: {
        'skills': ['skills:skill-typescript'],
        'business-domains': ['business-domains:fintech'],
      },
      assignment_provenance: ['explicit', 'derived'],
      assignment_review_states: ['reviewed', 'pending'],
      taxonomy_versions: ['business-domains:2', 'skills:7'],
      taxonomy_versions_by_namespace: { 'skills': 7, 'business-domains': 2 },
      taxonomy_completeness: ['business-domains:known_absent', 'skills:known_present'],
      taxonomy_completeness_by_namespace: {
        'business-domains': {
          resource: 'task',
          entityId: 'task-1',
          namespace: 'business-domains',
          state: 'known_absent',
          taxonomyVersion: 2,
          projectedAt: '2026-08-01T00:00:00.000Z',
          unresolvedCount: 1,
          belowThresholdCount: 2,
        },
        'skills': {
          resource: 'task',
          entityId: 'task-1',
          namespace: 'skills',
          state: 'known_present',
          taxonomyVersion: 7,
          projectedAt: '2026-08-01T00:00:00.000Z',
          unresolvedCount: 0,
          belowThresholdCount: 0,
        },
      },
      metadata_assignment_schema_version: 3,
      metadata_source_revisions: ['task-1:sha256:abc'],
      metadata_enrichment_versions_by_namespace: { skills: 11 },
    })
  })

  test('deduplicates stable projection values and never mixes free-form tags into canonical refs', ({
    assert,
  }) => {
    const baseAssignments = result().assignments
    const firstAssignment = baseAssignments[0]
    const secondAssignment = baseAssignments[1]
    if (!firstAssignment || !secondAssignment) {
      throw new Error('canonical metadata fixture is incomplete')
    }
    const projected = projectTaskCanonicalMetadata(
      result({
        assignments: [
          ...baseAssignments,
          firstAssignment,
          {
            ...secondAssignment,
            provenance: 'derived',
            reviewState: 'pending',
          },
        ],
      })
    )

    assert.deepEqual(projected.canonical_term_ids, [
      'skills:skill-typescript',
      'business-domains:fintech',
    ])
    assert.deepEqual(projected.assignment_provenance, ['explicit', 'derived'])
    assert.deepEqual(projected.assignment_review_states, ['reviewed', 'pending'])
    assert.notInclude(projected.canonical_term_ids, 'task.domain-tags:release-ready')
  })

  test('returns an explicit empty envelope when no canonical assignments are available', ({
    assert,
  }) => {
    assert.deepEqual(
      projectTaskCanonicalMetadata({
        assignments: [],
        taxonomyVersions: {},
        completeness: [],
        providerVersions: {
          assignmentSchemaVersion: 1,
          sourceRevisions: {},
          enrichmentVersions: {},
        },
      }),
      {
        canonical_term_ids: [],
        canonical_term_ids_known: true,
        canonical_term_ids_count: 0,
        canonical_term_ids_by_namespace: {},
        assignment_provenance: [],
        assignment_review_states: [],
        taxonomy_versions: [],
        taxonomy_versions_by_namespace: {},
        taxonomy_completeness: [],
        taxonomy_completeness_by_namespace: {},
        metadata_assignment_schema_version: 1,
        metadata_source_revisions: [],
        metadata_enrichment_versions_by_namespace: {},
      }
    )
  })
})
