import { test } from '@japa/runner'

import { TASK_CONTRACT_VERSION_V1_FIXTURE } from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import { isTaskAssignmentSnapshotV1 } from '#modules/tasks/public_contracts/task-authoring/validators'
import {
  buildTaskAssignmentContractSnapshot,
  hashTaskAssignmentIdentity,
  TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES,
  taskAssignmentIdentityHashInput,
} from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'
import { INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1 } from '#modules/tasks/domain/task-authoring/task_contract_change_classifier'
import type { TaskWorkContractResolutionResult } from '#modules/tasks/domain/task-authoring/task_contract_resolution'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'

const provenance: TaskWorkContractResolutionResult['provenance'] = {
  action: {
    source: 'task',
    sourceVersionId: TASK_CONTRACT_VERSION_V1_FIXTURE.taskSpecificationVersionId,
    inherited: false,
    privacyClassification: 'internal',
  },
  environment: {
    source: 'project_context',
    sourceVersionId:
      TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract.inheritedFrom.projectContextVersionId,
    inherited: true,
    privacyClassification: 'internal',
  },
}

function build(overrides: Record<string, unknown> = {}) {
  return buildTaskAssignmentContractSnapshot({
    snapshotId: '00000000-0000-4000-8000-000000000031',
    assignmentId: '00000000-0000-4000-8000-000000000032',
    taskId: TASK_CONTRACT_VERSION_V1_FIXTURE.taskId,
    organizationId: '00000000-0000-4000-8000-000000000033',
    projectId: '00000000-0000-4000-8000-000000000034',
    assigneeId: '00000000-0000-4000-8000-000000000035',
    assignedBy: TASK_CONTRACT_VERSION_V1_FIXTURE.creatorConfirmedBy,
    contract: TASK_CONTRACT_VERSION_V1_FIXTURE,
    workFieldProvenance: provenance,
    readinessFindingCodesResolved: [],
    acknowledgementRequired: true,
    createdAt: '2026-08-01T10:00:00.000Z',
    hasher: new NodeTaskContractContentHasher(),
    ...overrides,
  })
}

test.group('Task assignment canonical Contract snapshot', () => {
  test('builds a validator-conformant self-contained snapshot with exact pins and field provenance', ({
    assert,
  }) => {
    const result = build()

    assert.isTrue(result.allowed)
    if (!result.allowed) return
    assert.isTrue(isTaskAssignmentSnapshotV1(result.value.snapshot))
    assert.equal(
      result.value.snapshot.provenance.taskContractVersionId,
      TASK_CONTRACT_VERSION_V1_FIXTURE.id
    )
    assert.equal(result.value.workFieldProvenance['environment']?.inherited, true)
    assert.deepEqual(result.value.changeDecision, INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1)
    assert.match(result.value.snapshot.snapshotHash, /^sha256:[0-9a-f]{64}$/)

    const { snapshotHash, ...snapshotWithoutHash } = result.value.snapshot
    assert.equal(
      snapshotHash,
      new NodeTaskContractContentHasher().hash({
        envelopeSchemaVersion: result.value.schemaVersion,
        snapshot: snapshotWithoutHash,
        workFieldProvenance: result.value.workFieldProvenance,
        acknowledgementBasis: result.value.acknowledgementBasis,
        changeDecision: result.value.changeDecision,
      })
    )
  })

  test('pins Project business domains in the immutable assignment snapshot', ({ assert }) => {
    const result = build({ projectBusinessDomains: ['security', 'saas', 'security'] })

    assert.isTrue(result.allowed)
    if (!result.allowed) return
    assert.deepEqual(result.value.snapshot.projectBusinessDomains, ['saas', 'security'])
    assert.isTrue(isTaskAssignmentSnapshotV1(result.value.snapshot))
  })

  test('fails closed when immutable classifier metadata is missing or contradicts initial policy', ({
    assert,
  }) => {
    const result = build({
      changeDecision: {
        ...INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
        requiresReack: false,
      },
    })

    assert.isFalse(result.allowed)
    if (result.allowed) return
    assert.include(
      [...result.blockerCodes],
      TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.changeDecisionInvalid
    )
  })

  test('is deterministic for semantic input and canonicalizes duplicate finding/rubric IDs', ({
    assert,
  }) => {
    const first = build({ readinessFindingCodesResolved: ['B', 'A', 'B'] })
    const second = build({ readinessFindingCodesResolved: ['A', 'B'] })

    assert.isTrue(first.allowed)
    assert.isTrue(second.allowed)
    if (!first.allowed || !second.allowed) return
    assert.equal(first.value.snapshot.snapshotHash, second.value.snapshot.snapshotHash)
    assert.deepEqual(first.value.snapshot.readinessFindingCodesResolved, ['A', 'B'])
  })

  test('derives a stable assignment identity distinct from governed snapshot successors', ({ assert }) => {
    const first = build()
    const successor = build({
      snapshotId: '00000000-0000-4000-8000-000000000041',
      readinessFindingCodesResolved: ['TVA.READINESS.PREVIOUS_WARNING_RESOLVED'],
    })

    assert.isTrue(first.allowed)
    assert.isTrue(successor.allowed)
    if (!first.allowed || !successor.allowed) return
    const hasher = new NodeTaskContractContentHasher()
    const firstIdentity = hashTaskAssignmentIdentity(first.value.snapshot, hasher)
    const successorIdentity = hashTaskAssignmentIdentity(successor.value.snapshot, hasher)

    assert.equal(firstIdentity, successorIdentity)
    assert.notEqual(first.value.snapshot.snapshotHash, successor.value.snapshot.snapshotHash)
    assert.equal(
      taskAssignmentIdentityHashInput(first.value.snapshot)['assignmentId'],
      first.value.snapshot.assignmentId
    )
  })

  test('fails closed for task mismatch, missing provenance/confirmation/project, or readiness gaps', ({
    assert,
  }) => {
    const contract = {
      ...TASK_CONTRACT_VERSION_V1_FIXTURE,
      creatorConfirmedBy: null,
      creatorConfirmedAt: null,
      resolvedContract: {
        ...TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract,
        readiness: {
          ...TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract.readiness,
          assignmentReady: false,
          evidenceReady: false,
        },
      },
    }
    const result = build({
      taskId: '00000000-0000-4000-8000-000000000099',
      projectId: null,
      contract,
      workFieldProvenance: {},
    })

    assert.isFalse(result.allowed)
    if (result.allowed) return
    assert.includeMembers([...result.blockerCodes], [
      TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.taskMismatch,
      TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.assignmentNotReady,
      TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.evidenceNotReady,
      TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.creatorConfirmationMissing,
      TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.projectMissing,
      TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.resolutionProvenanceMissing,
    ])
  })
})
