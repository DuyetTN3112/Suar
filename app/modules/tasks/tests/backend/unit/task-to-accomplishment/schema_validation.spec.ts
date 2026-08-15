import { test } from '@japa/runner'

import {
  COMPLETION_CLAIM_V1_FIXTURE,
  PROJECT_CONTEXT_VERSION_V1_FIXTURE,
  REVIEW_OBSERVATION_V1_FIXTURE,
  TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE,
  TASK_CONTRACT_VERSION_V1_FIXTURE,
  TASK_SPECIFICATION_VERSION_V1_FIXTURE,
  WORK_PACKAGE_VERSION_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import { TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS } from '#modules/tasks/public_contracts/task-authoring/primitives'
import {
  isCompletionClaimV1,
  isProjectContextVersionV1,
  isReviewObservationV1,
  isTaskAssignmentSnapshotV1,
  isTaskContractVersionV1,
  isTaskSpecificationVersionV1,
  isWorkPackageVersionV1,
} from '#modules/tasks/public_contracts/task-authoring/validators'

const clone = <T>(value: T): T => structuredClone(value)

test.group('Unit | TVA schema compatibility and rejection rules', () => {
  test('accepts additive unknown fields without accepting an unknown breaking schema version', ({
    assert,
  }) => {
    const additivePayload = {
      ...PROJECT_CONTEXT_VERSION_V1_FIXTURE,
      futureAdditiveMetadata: { source: 'future-client' },
    }
    const breakingPayload = {
      ...PROJECT_CONTEXT_VERSION_V1_FIXTURE,
      schemaVersion: 'suar.project_context_version.v2',
    }

    assert.isTrue(isProjectContextVersionV1(additivePayload))
    assert.isFalse(isProjectContextVersionV1(breakingPayload))
  })

  test('rejects invalid UUID, timestamp, content hash, and closed enum values', ({ assert }) => {
    assert.isFalse(
      isProjectContextVersionV1({
        ...PROJECT_CONTEXT_VERSION_V1_FIXTURE,
        projectId: 'not-a-uuid',
      })
    )
    assert.isFalse(
      isProjectContextVersionV1({
        ...PROJECT_CONTEXT_VERSION_V1_FIXTURE,
        createdAt: '2026-08-01',
      })
    )
    assert.isFalse(
      isProjectContextVersionV1({
        ...PROJECT_CONTEXT_VERSION_V1_FIXTURE,
        contentHash: 'abc123',
      })
    )
    assert.isFalse(
      isProjectContextVersionV1({
        ...PROJECT_CONTEXT_VERSION_V1_FIXTURE,
        privacyClassification: 'future-secret',
      })
    )
  })

  test('requires explicit nullable provenance instead of treating absence as unknown', ({
    assert,
  }) => {
    const snapshot = clone(TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE) as Record<string, unknown>
    const provenance = clone(snapshot['provenance']) as Record<string, unknown>
    delete provenance['projectContextVersionId']
    snapshot['provenance'] = provenance

    assert.isFalse(isTaskAssignmentSnapshotV1(snapshot))
    assert.isTrue(isTaskAssignmentSnapshotV1(TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE))
  })

  test('validates the optional pinned taxonomy metadata envelope', ({ assert }) => {
    const snapshot = clone(TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE) as Record<string, unknown>
    const taskId = snapshot['taskId'] as string
    snapshot['taxonomyMetadata'] = {
      schemaVersion: 'suar.task_assignment_taxonomy_metadata.v1',
      entityId: taskId,
      sourceRevision: 'task-source-v1',
      projectedAt: '2026-08-01T12:00:00.000Z',
      assignments: [
        {
          resource: 'task',
          entityId: taskId,
          term: { namespace: 'technology', termId: 'typescript' },
          provenance: 'explicit',
          reviewState: 'reviewed',
          sourceType: 'creator',
          taxonomyVersion: 1,
        },
      ],
      freeFormTags: [
        {
          resource: 'task',
          entityId: taskId,
          tagSpace: 'creator',
          sourceType: 'creator',
          displayValue: 'backend',
          normalizedValue: 'backend',
        },
      ],
      taxonomyVersions: { technology: 1 },
      diagnostics: [],
      completeness: [
        {
          resource: 'task',
          entityId: taskId,
          namespace: 'technology',
          state: 'known_present',
          taxonomyVersion: 1,
          projectedAt: '2026-08-01T12:00:00.000Z',
          unresolvedCount: 0,
          belowThresholdCount: 0,
        },
      ],
      providerVersions: {
        assignmentSchemaVersion: 1,
        sourceRevisions: { [taskId]: 'task-source-v1' },
        enrichmentVersions: { technology: 1 },
      },
    }

    assert.isTrue(isTaskAssignmentSnapshotV1(snapshot))
    assert.isTrue(
      isTaskAssignmentSnapshotV1({
        ...TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE,
        taxonomyMetadata: null,
      })
    )
    assert.isFalse(
      isTaskAssignmentSnapshotV1({
        ...snapshot,
        taxonomyMetadata: {
          ...(snapshot['taxonomyMetadata'] as Record<string, unknown>),
          assignments: [
            (() => {
              const metadata = snapshot['taxonomyMetadata'] as Record<string, unknown>
              const assignment = (metadata['assignments'] as unknown[])[0]
              if (!assignment || typeof assignment !== 'object') {
                throw new Error('Taxonomy assignment fixture is missing')
              }
              return {
                ...(assignment as Record<string, unknown>),
                entityId: '00000000-0000-4000-8000-000000000099',
              }
            })(),
          ],
        },
      })
    )
    const metadata = snapshot['taxonomyMetadata'] as Record<string, unknown>
    assert.isFalse(
      isTaskAssignmentSnapshotV1({
        ...snapshot,
        taxonomyMetadata: {
          ...metadata,
          entityId: '00000000-0000-4000-8000-000000000099',
        },
      })
    )
    assert.isFalse(
      isTaskAssignmentSnapshotV1({
        ...snapshot,
        taxonomyMetadata: {
          ...metadata,
          completeness: [
            {
              ...(metadata['completeness'] as Array<Record<string, unknown>>)[0],
              resource: 'project',
            },
          ],
        },
      })
    )
  })

  test('accepts an absent optional change reason but rejects duplicate structured IDs', ({
    assert,
  }) => {
    const specification = clone(TASK_SPECIFICATION_VERSION_V1_FIXTURE) as Record<string, unknown>
    delete specification['changeReason']

    const contract = clone(TASK_CONTRACT_VERSION_V1_FIXTURE) as Record<string, unknown>
    const work = clone(contract['workContract']) as Record<string, unknown>
    const scope = clone(work['scope']) as Array<Record<string, unknown>>
    const duplicatedScope = scope[0]
    if (!duplicatedScope) {
      throw new Error('Golden fixture must contain a scope item')
    }
    scope.push(clone(duplicatedScope))
    work['scope'] = scope
    contract['workContract'] = work

    assert.isTrue(isTaskSpecificationVersionV1(specification))
    assert.isFalse(isTaskContractVersionV1(contract))
  })

  test('allows a Work Package version without Project Context while native assignment keeps Project provenance', ({
    assert,
  }) => {
    assert.isTrue(
      isWorkPackageVersionV1({
        ...WORK_PACKAGE_VERSION_V1_FIXTURE,
        projectContextVersionId: null,
      })
    )
    assert.isFalse(
      isTaskAssignmentSnapshotV1({
        ...TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE,
        projectId: null,
      })
    )
  })

  test('rejects rich JSON beyond the protocol depth limit', ({ assert }) => {
    let tooDeep: Record<string, unknown> = { value: 'leaf' }
    for (let depth = 0; depth <= TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS.maxJsonDepth; depth += 1) {
      tooDeep = { child: tooDeep }
    }

    assert.isFalse(
      isTaskSpecificationVersionV1({
        ...TASK_SPECIFICATION_VERSION_V1_FIXTURE,
        richContent: tooDeep,
      })
    )
  })

  test('does not accept an unknown readiness or change-class enum', ({ assert }) => {
    assert.isFalse(
      isTaskContractVersionV1({
        ...TASK_CONTRACT_VERSION_V1_FIXTURE,
        readinessState: 'future-ready-state',
      })
    )
    assert.isFalse(
      isTaskSpecificationVersionV1({
        ...TASK_SPECIFICATION_VERSION_V1_FIXTURE,
        changeClass: 'silent-material-change',
      })
    )
  })

  test('requires immutable Completion Report and Review policy provenance', ({ assert }) => {
    const completionClaim = clone(COMPLETION_CLAIM_V1_FIXTURE) as Record<string, unknown>
    delete completionClaim['completionReportHash']

    const reviewObservation = clone(REVIEW_OBSERVATION_V1_FIXTURE) as Record<string, unknown>
    delete reviewObservation['reviewPolicyVersion']

    assert.isFalse(isCompletionClaimV1(completionClaim))
    assert.isFalse(isReviewObservationV1(reviewObservation))
    assert.isFalse(
      isReviewObservationV1({
        ...REVIEW_OBSERVATION_V1_FIXTURE,
        confidence: 1.01,
      })
    )
  })
})
