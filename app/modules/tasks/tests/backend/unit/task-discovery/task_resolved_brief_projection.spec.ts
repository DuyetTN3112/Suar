import { test } from '@japa/runner'

import type { TaskAssignmentContractSnapshotRecord } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { CurrentTaskAuthoringBundle } from '#modules/tasks/actions/ports/outbound/task_resolved_brief_reader'
import {
  projectStaleAssignmentAccessBrief,
  projectTaskAssignmentResolvedBrief,
  projectTaskResolvedBrief,
} from '#modules/tasks/actions/queries/task-reading/internal/task_resolved_brief_projection'
import { INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1 } from '#modules/tasks/domain/task-authoring/task_contract_change_classifier'
import {
  RESOLVED_TASK_CONTRACT_V1_FIXTURE,
  TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE,
  TASK_CONTRACT_VERSION_V1_FIXTURE,
  TASK_SPECIFICATION_VERSION_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import type { TaskContractVersionV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'

function bundle(
  contract: TaskContractVersionV1 | null = TASK_CONTRACT_VERSION_V1_FIXTURE
): CurrentTaskAuthoringBundle {
  return {
    headRevision: 1,
    specification: TASK_SPECIFICATION_VERSION_V1_FIXTURE,
    contract,
    workFieldProvenance: contract
      ? {
          action: {
            source: 'task',
            sourceVersionId: TASK_SPECIFICATION_VERSION_V1_FIXTURE.id,
            inherited: false,
            privacyClassification: 'internal',
          },
        }
      : null,
    supportingReferences: RESOLVED_TASK_CONTRACT_V1_FIXTURE.supportingReferences,
    readiness: RESOLVED_TASK_CONTRACT_V1_FIXTURE.readiness,
    readinessFindingCodesResolved: [],
  }
}

const assignmentSnapshot: TaskAssignmentContractSnapshotRecord = {
  id: TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.id,
  assignmentId: TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.assignmentId,
  taskId: TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.taskId,
  sequence: 1,
  previousSnapshotId: null,
  envelope: {
    schemaVersion: 'suar.task_assignment_contract_snapshot.v1',
    snapshot: TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE,
    workFieldProvenance: bundle().workFieldProvenance ?? {},
    acknowledgementBasis: {
      kind: 'fresh_assignment',
      previousSnapshotId: null,
      previousAcknowledgementState: null,
      changeClass: 'initial',
    },
    changeDecision: INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
  },
  snapshotHash: TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.snapshotHash,
  acknowledgementRequired: true,
  acknowledgementState: 'pending',
  idempotencyKey: 'assignment-projection-v1',
  replayed: false,
}

test.group('Task resolved brief projection', () => {
  test('creator gets immutable authoring source and resolved Contract', ({ assert }) => {
    const projection = projectTaskResolvedBrief(bundle(), 'creator_edit')

    assert.equal(projection.state, 'published')
    assert.equal(projection.headRevision, 1)
    assert.equal(projection.resolvedContract?.versionId, TASK_CONTRACT_VERSION_V1_FIXTURE.id)
    assert.equal(projection.authoring?.specification.id, TASK_SPECIFICATION_VERSION_V1_FIXTURE.id)
    assert.equal(projection.authoring?.supportingReferences.length, 1)
    assert.equal(projection.workFieldProvenance?.['action']?.source, 'task')
  })

  test('work participant gets self-contained resolved brief without creator-only provenance', ({
    assert,
  }) => {
    const projection = projectTaskResolvedBrief(bundle(), 'work_participant')

    assert.equal(projection.state, 'published')
    assert.equal(
      projection.resolvedContract?.specification.plainText,
      RESOLVED_TASK_CONTRACT_V1_FIXTURE.specification.plainText
    )
    assert.isNull(projection.authoring)
    assert.equal(projection.workFieldProvenance?.['action']?.inherited, false)
  })

  test('project members get the published contract without creator-only provenance', ({ assert }) => {
    const projection = projectTaskResolvedBrief(bundle(), 'project_member')

    assert.equal(projection.state, 'published')
    assert.equal(
      projection.resolvedContract?.specification.plainText,
      RESOLVED_TASK_CONTRACT_V1_FIXTURE.specification.plainText
    )
    assert.isNull(projection.authoring)
    assert.isNull(projection.assignmentSnapshotId)
  })

  test('work participant projection is pinned to the immutable assignment snapshot', ({
    assert,
  }) => {
    const projection = projectTaskAssignmentResolvedBrief(assignmentSnapshot, 'work_participant')

    assert.equal(projection.resolutionSource, 'assignment_snapshot')
    assert.equal(projection.assignmentSnapshotId, assignmentSnapshot.id)
    assert.equal(projection.assignmentSnapshotHash, assignmentSnapshot.snapshotHash)
    assert.equal(
      projection.contractVersionId,
      TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.provenance.taskContractVersionId
    )
    assert.deepEqual(
      projection.resolvedContract,
      TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.resolvedContract
    )
    assert.isNull(projection.authoring)
  })

  test('exposes a safe material-change summary for successor re-acknowledgement', ({ assert }) => {
    const successor: TaskAssignmentContractSnapshotRecord = {
      ...assignmentSnapshot,
      envelope: {
        ...assignmentSnapshot.envelope,
        acknowledgementBasis: {
          kind: 'reacknowledgement_required',
          previousSnapshotId: assignmentSnapshot.id,
          previousAcknowledgementState: 'acknowledged',
          changeClass: 'material_scope',
        },
        changeDecision: {
          ...INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
          changeClass: 'material_scope',
          code: 'TVA.CHANGE.MATERIAL_SCOPE',
          codes: ['TVA.CHANGE.MATERIAL_SCOPE'],
          changedPaths: ['resolvedContract.work.deliverables'],
          requiresReack: true,
        },
      },
      sequence: 2,
      previousSnapshotId: assignmentSnapshot.id,
      acknowledgementState: 'pending',
    }

    const projection = projectTaskAssignmentResolvedBrief(successor, 'work_participant')

    assert.deepEqual(projection.changeSummary, {
      changeClass: 'material_scope',
      changedPaths: ['resolvedContract.work.deliverables'],
      requiresReack: true,
      isSuccessor: true,
    })
  })

  test('creator can inspect a Draft while project members only see not-published state', ({
    assert,
  }) => {
    const draft = bundle(null)
    const creator = projectTaskResolvedBrief(draft, 'creator_edit')
    const participant = projectTaskResolvedBrief(draft, 'work_participant')
    const projectMember = projectTaskResolvedBrief(draft, 'project_member')

    assert.equal(creator.state, 'draft')
    assert.equal(creator.authoring?.specification.id, draft.specification.id)
    assert.isNull(creator.resolvedContract)
    assert.equal(participant.state, 'draft')
    assert.equal(participant.restrictionCode, 'TASK_BRIEF_NOT_PUBLISHED')
    assert.isNull(participant.headRevision)
    assert.isNull(participant.specificationVersionId)
    assert.isNull(participant.authoring)
    assert.isNull(participant.resolvedContract)
    assert.equal(projectMember.state, 'draft')
    assert.equal(projectMember.restrictionCode, 'TASK_BRIEF_NOT_PUBLISHED')
    assert.isNull(projectMember.headRevision)
    assert.isNull(projectMember.authoring)
    assert.isNull(projectMember.resolvedContract)
  })

  test('public projection fails closed without leaking internal text, URI, hashes, or version IDs', ({
    assert,
  }) => {
    const projection = projectTaskResolvedBrief(bundle(), 'public_preview')
    const serialized = JSON.stringify(projection)
    const internalReferenceUri = RESOLVED_TASK_CONTRACT_V1_FIXTURE.supportingReferences[0].uri

    assert.equal(projection.state, 'restricted')
    assert.equal(projection.restrictionCode, 'TASK_BRIEF_PUBLIC_PROJECTION_UNAVAILABLE')
    assert.notInclude(serialized, RESOLVED_TASK_CONTRACT_V1_FIXTURE.specification.plainText)
    assert.notInclude(serialized, internalReferenceUri)
    assert.notInclude(serialized, TASK_SPECIFICATION_VERSION_V1_FIXTURE.id)
    assert.notInclude(serialized, TASK_CONTRACT_VERSION_V1_FIXTURE.contentHash)
  })

  test('legacy Task is explicit and never receives a synthetic verified brief', ({ assert }) => {
    const projection = projectTaskResolvedBrief(null, 'creator_edit')

    assert.equal(projection.state, 'legacy')
    assert.equal(projection.restrictionCode, 'TASK_BRIEF_LEGACY_UNVERSIONED')
    assert.isNull(projection.resolvedContract)
    assert.isNull(projection.authoring)
  })

  test('stale actor-bound assignment access fails closed without a snapshot or contract', ({
    assert,
  }) => {
    const projection = projectStaleAssignmentAccessBrief('work_participant')

    assert.equal(projection.state, 'restricted')
    assert.equal(projection.audience, 'work_participant')
    assert.equal(projection.resolutionSource, 'restricted')
    assert.equal(projection.restrictionCode, 'TASK_BRIEF_ASSIGNMENT_ACCESS_STALE')
    assert.isNull(projection.assignmentSnapshotId)
    assert.isNull(projection.assignmentSnapshotHash)
    assert.isNull(projection.resolvedContract)
    assert.isNull(projection.authoring)
  })
})
