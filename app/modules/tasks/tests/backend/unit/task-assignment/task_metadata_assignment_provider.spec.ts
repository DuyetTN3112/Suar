import { test } from '@japa/runner'

import type {
  TaskMetadataAssignmentAccessContext,
  TaskMetadataAssignmentSourceReader,
  TaskMetadataEntitySource,
} from '#modules/tasks/actions/ports/outbound/task_metadata_assignment_source_reader'
import { TaskMetadataAssignmentProvider } from '#modules/tasks/infra/adapters/task-assignment/task_metadata_assignment_provider'

const projectedAt = '2026-08-01T00:00:00.000Z'

function entity(overrides: Partial<TaskMetadataEntitySource> = {}): TaskMetadataEntitySource {
  return {
    entityId: 'task-public',
    organizationId: 'org-public',
    visibility: 'external',
    deleted: false,
    sourceRevision: 'revision-7',
    projectedAt,
    namespaces: [],
    freeFormTags: [],
    ...overrides,
  }
}

function reader(entities: readonly TaskMetadataEntitySource[]): TaskMetadataAssignmentSourceReader {
  return {
    loadVisibleTaskMetadata: ({ entityIds }) => {
      const requested = new Set(entityIds)
      return Promise.resolve(entities.filter(({ entityId }) => requested.has(entityId)))
    },
  }
}

const memberContext: TaskMetadataAssignmentAccessContext = {
  attributes: { authorizedTaskIds: ['task-private'] },
}

test.group('Task metadata assignment provider', () => {
  test('projects every canonical assignment and keeps free tags separate', async ({ assert }) => {
    const source = entity({
      namespaces: [
        {
          namespace: 'skills',
          state: 'known_present',
          taxonomyVersion: 41,
          assignments: [
            {
              termId: 'skill-typescript',
              provenance: 'suggested',
              reviewState: 'pending',
              confidence: 0.4,
              sourceType: 'task_required_skill',
              sourceId: 'suggested-duplicate',
            },
            {
              termId: 'skill-typescript',
              provenance: 'explicit',
              reviewState: 'reviewed',
              sourceType: 'task_required_skill',
              sourceId: 'reviewed-winner',
            },
            {
              termId: 'skill-postgresql',
              provenance: 'imported',
              reviewState: 'reviewed',
              confidence: 0.91,
              sourceType: 'task_required_skill',
              sourceId: 'requirement-2',
              evidenceRefs: ['import-batch:9'],
              validFrom: '2026-07-01T00:00:00.000Z',
              validUntil: '2027-07-01T00:00:00.000Z',
            },
          ],
        },
        {
          namespace: 'business-domains',
          state: 'known_present',
          taxonomyVersion: 5,
          assignments: [
            {
              termId: 'fintech',
              provenance: 'explicit',
              reviewState: 'reviewed',
              sourceType: 'task.business_domain',
            },
          ],
        },
        {
          namespace: 'problem-categories',
          state: 'known_present',
          taxonomyVersion: 3,
          assignments: [
            {
              termId: 'scalability',
              provenance: 'explicit',
              reviewState: 'reviewed',
              sourceType: 'task.problem_category',
            },
          ],
        },
        {
          namespace: 'task-types',
          state: 'known_present',
          taxonomyVersion: 8,
          assignments: [
            {
              termId: 'architecture_design',
              provenance: 'explicit',
              reviewState: 'reviewed',
              sourceType: 'task.task_type',
            },
          ],
        },
        {
          namespace: 'technologies',
          state: 'known_present',
          taxonomyVersion: 13,
          assignments: [
            {
              termId: 'TypeScript',
              provenance: 'explicit',
              reviewState: 'reviewed',
              sourceType: 'task.tech_stack',
            },
            {
              termId: 'typescript',
              provenance: 'derived',
              reviewState: 'pending',
              confidence: 0.7,
              sourceType: 'normalizer',
            },
          ],
        },
      ],
      freeFormTags: [
        { value: 'Search', tagSpace: 'task.domain-tags', sourceType: 'task.domain_tags' },
        { value: 'Ｓｅａｒｃｈ', tagSpace: 'task.domain-tags', sourceType: 'task.domain_tags' },
        { value: 'Payments', tagSpace: 'task.domain-tags', sourceType: 'task.domain_tags' },
      ],
    })
    const provider = new TaskMetadataAssignmentProvider(reader([source]))

    const result = await provider.getAssignments({ resource: 'task', entityIds: [source.entityId] })

    assert.lengthOf(result.assignments, 6)
    assert.deepEqual(
      result.assignments.map(({ term }) => `${term.namespace}:${term.termId}`),
      [
        'business-domains:fintech',
        'problem-categories:scalability',
        'skills:skill-postgresql',
        'skills:skill-typescript',
        'task-types:architecture_design',
        'technologies:typescript',
      ]
    )
    const reviewedSkill = result.assignments.find(({ term }) => term.termId === 'skill-typescript')
    assert.equal(reviewedSkill?.sourceId, 'reviewed-winner')
    assert.equal(reviewedSkill?.provenance, 'explicit')
    assert.notProperty(reviewedSkill ?? {}, 'confidence')
    const importedSkill = result.assignments.find(({ term }) => term.termId === 'skill-postgresql')
    assert.deepInclude(importedSkill, {
      provenance: 'imported',
      reviewState: 'reviewed',
      confidence: 0.91,
      validFrom: '2026-07-01T00:00:00.000Z',
      validUntil: '2027-07-01T00:00:00.000Z',
    })
    assert.deepEqual(
      result.freeFormTags.map(({ displayValue, normalizedValue }) => ({
        displayValue,
        normalizedValue,
      })),
      [
        { displayValue: 'Payments', normalizedValue: 'payments' },
        { displayValue: 'Search', normalizedValue: 'search' },
      ]
    )
    assert.isFalse(
      result.assignments.some(({ term }) => ['search', 'payments'].includes(term.termId))
    )
  })

  test('preserves provenance, review, calibrated confidence, and validity variants', async ({
    assert,
  }) => {
    const variants = [
      ['explicit', 'reviewed', undefined, 'one'],
      ['imported', 'pending', 0, 'two'],
      ['derived', 'disputed', 0.5, 'three'],
      ['suggested', 'expired', 1, 'four'],
    ] as const
    const provider = new TaskMetadataAssignmentProvider(
      reader([
        entity({
          namespaces: [
            {
              namespace: 'skills',
              state: 'known_present',
              taxonomyVersion: 9,
              enrichmentVersion: 12,
              assignments: variants.map(([provenance, reviewState, confidence, termId]) => ({
                termId,
                provenance,
                reviewState,
                ...(confidence === undefined ? {} : { confidence }),
                sourceType: `fixture.${provenance}`,
                validFrom: '2026-01-01T00:00:00.000Z',
                validUntil: '2026-12-31T23:59:59.000Z',
                enrichmentVersion: 12,
              })),
            },
          ],
        }),
      ])
    )

    const result = await provider.getAssignments({ resource: 'task', entityIds: ['task-public'] })

    assert.deepEqual(
      result.assignments.map(({ provenance, reviewState, confidence }) => ({
        provenance,
        reviewState,
        ...(confidence === undefined ? {} : { confidence }),
      })),
      [
        { provenance: 'suggested', reviewState: 'expired', confidence: 1 },
        { provenance: 'explicit', reviewState: 'reviewed' },
        { provenance: 'derived', reviewState: 'disputed', confidence: 0.5 },
        { provenance: 'imported', reviewState: 'pending', confidence: 0 },
      ]
    )
    assert.isTrue(
      result.assignments.every(
        ({ validFrom, validUntil, enrichmentVersion }) =>
          validFrom === '2026-01-01T00:00:00.000Z' &&
          validUntil === '2026-12-31T23:59:59.000Z' &&
          enrichmentVersion === 12
      )
    )
  })

  test('distinguishes visible empty/missing completeness from hidden or unknown entities', async ({
    assert,
  }) => {
    const source = entity({
      namespaces: [
        {
          namespace: 'skills',
          state: 'missing',
          taxonomyVersion: 41,
          assignments: [],
        },
        {
          namespace: 'technologies',
          state: 'known_absent',
          taxonomyVersion: 13,
          assignments: [],
        },
        {
          namespace: 'task-types',
          state: 'not_applicable',
          taxonomyVersion: 8,
          assignments: [],
        },
        {
          namespace: 'business-domains',
          state: 'stale',
          taxonomyVersion: 5,
          enrichmentVersion: 4,
          assignments: [],
          unresolvedCount: 2,
          belowThresholdCount: 1,
        },
      ],
    })
    const provider = new TaskMetadataAssignmentProvider(reader([source]))

    const visible = await provider.getAssignments({
      resource: 'task',
      entityIds: [source.entityId],
    })
    const unknown = await provider.getAssignments({ resource: 'task', entityIds: ['missing-task'] })

    assert.isEmpty(visible.assignments)
    assert.deepEqual(visible.taxonomyVersions, {
      'business-domains': 5,
      'skills': 41,
      'task-types': 8,
      'technologies': 13,
    })
    assert.deepEqual(
      visible.completeness.map(({ namespace, state }) => ({ namespace, state })),
      [
        { namespace: 'business-domains', state: 'stale' },
        { namespace: 'skills', state: 'missing' },
        { namespace: 'task-types', state: 'not_applicable' },
        { namespace: 'technologies', state: 'known_absent' },
      ]
    )
    assert.deepEqual(visible.providerVersions, {
      assignmentSchemaVersion: 1,
      sourceRevisions: { 'task-public': 'revision-7' },
      enrichmentVersions: { 'business-domains': 4 },
    })
    assert.deepEqual(unknown, {
      assignments: [],
      freeFormTags: [],
      taxonomyVersions: {},
      diagnostics: [],
      completeness: [],
      providerVersions: {
        assignmentSchemaVersion: 1,
        sourceRevisions: {},
        enrichmentVersions: {},
      },
    })
  })

  test('preserves hundreds of legitimate labels without truncation', async ({ assert }) => {
    const assignments = Array.from({ length: 250 }, (_, index) => ({
      termId: `technology-${String(index).padStart(3, '0')}`,
      provenance: 'explicit' as const,
      reviewState: 'reviewed' as const,
      sourceType: 'task.tech_stack',
    }))
    const provider = new TaskMetadataAssignmentProvider(
      reader([
        entity({
          namespaces: [
            {
              namespace: 'technologies',
              state: 'known_present',
              taxonomyVersion: 13,
              assignments,
            },
          ],
        }),
      ])
    )

    const result = await provider.getAssignments({ resource: 'task', entityIds: ['task-public'] })

    assert.lengthOf(result.assignments, 250)
    assert.lengthOf(new Set(result.assignments.map(({ term }) => term.termId)), 250)
    assert.equal(result.assignments.at(-1)?.term.termId, 'technology-249')
  })

  test('rejects invalid confidence and impossible validity dates without reflecting source values', async ({
    assert,
  }) => {
    const provider = new TaskMetadataAssignmentProvider(
      reader([
        entity({
          namespaces: [
            {
              namespace: 'skills',
              state: 'unresolved',
              taxonomyVersion: 41,
              assignments: [
                {
                  termId: 'private-invalid-confidence',
                  provenance: 'suggested',
                  reviewState: 'pending',
                  confidence: 1.01,
                  sourceType: 'machine-suggestion',
                },
                {
                  termId: 'private-impossible-date',
                  provenance: 'imported',
                  reviewState: 'reviewed',
                  sourceType: 'legacy-import',
                  validFrom: '2026-02-30T00:00:00.000Z',
                },
              ],
            },
          ],
        }),
      ])
    )

    const result = await provider.getAssignments({ resource: 'task', entityIds: ['task-public'] })

    assert.isEmpty(result.assignments)
    assert.deepEqual(
      result.diagnostics.map(({ code }) => code),
      ['confidence_out_of_range', 'invalid_validity_timestamp']
    )
    assert.notInclude(JSON.stringify(result.diagnostics), 'private-invalid-confidence')
    assert.notInclude(JSON.stringify(result.diagnostics), 'private-impossible-date')
  })

  test('applies namespace subsets without flattening unrelated metadata', async ({ assert }) => {
    const source = entity({
      namespaces: [
        {
          namespace: 'skills',
          state: 'known_present',
          taxonomyVersion: 41,
          assignments: [
            {
              termId: 'skill-one',
              provenance: 'explicit',
              reviewState: 'reviewed',
              sourceType: 'task_required_skill',
            },
          ],
        },
        {
          namespace: 'technologies',
          state: 'known_present',
          taxonomyVersion: 13,
          assignments: [
            {
              termId: 'postgresql',
              provenance: 'explicit',
              reviewState: 'reviewed',
              sourceType: 'task.tech_stack',
            },
          ],
        },
      ],
      freeFormTags: [
        { value: 'Discovery', tagSpace: 'task.domain-tags', sourceType: 'task.domain_tags' },
      ],
    })
    const provider = new TaskMetadataAssignmentProvider(reader([source]))

    const result = await provider.getAssignments({
      resource: 'task',
      entityIds: [source.entityId],
      namespaces: ['skills'],
    })

    assert.deepEqual(
      result.assignments.map(({ term }) => term.namespace),
      ['skills']
    )
    assert.deepEqual(result.taxonomyVersions, { skills: 41 })
    assert.deepEqual(
      result.completeness.map(({ namespace }) => namespace),
      ['skills']
    )
    assert.isEmpty(result.freeFormTags)
  })

  test('filters private and unrequested source rows again at the provider boundary', async ({
    assert,
  }) => {
    const hiddenValue = 'private-client-secret'
    const privateEntity = entity({
      entityId: 'task-private',
      organizationId: 'org-private',
      visibility: 'internal',
      sourceRevision: 'private-revision',
      namespaces: [
        {
          namespace: 'business-domains',
          state: 'known_present',
          taxonomyVersion: 5,
          assignments: [
            {
              termId: hiddenValue,
              provenance: 'explicit',
              reviewState: 'reviewed',
              sourceType: 'task.business_domain',
            },
          ],
        },
      ],
    })
    const injected = entity({
      entityId: 'task-not-requested',
      namespaces: privateEntity.namespaces,
    })
    const leakingReader: TaskMetadataAssignmentSourceReader = {
      loadVisibleTaskMetadata: () => Promise.resolve([privateEntity, injected]),
    }
    const provider = new TaskMetadataAssignmentProvider(leakingReader)

    const denied = await provider.getAssignments({ resource: 'task', entityIds: ['task-private'] })
    const allowed = await provider.getAssignments(
      { resource: 'task', entityIds: ['task-private'] },
      memberContext
    )

    assert.deepEqual(
      denied,
      await provider.getAssignments({ resource: 'task', entityIds: ['unknown'] })
    )
    assert.isEmpty(denied.assignments)
    assert.lengthOf(allowed.assignments, 1)
    assert.equal(allowed.assignments[0]?.term.termId, hiddenValue)
    assert.notInclude(JSON.stringify(denied), hiddenValue)
    assert.notInclude(JSON.stringify(allowed), 'task-not-requested')
  })
})
