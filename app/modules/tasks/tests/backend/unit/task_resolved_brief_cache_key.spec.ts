import { test } from '@japa/runner'

import type { TaskAssignmentContractSnapshotRecord } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { CurrentTaskAuthoringBundle } from '#modules/tasks/actions/ports/outbound/task_resolved_brief_reader'
import { buildTaskResolvedBriefCacheKey } from '#modules/tasks/actions/queries/task-reading/internal/task_resolved_brief_cache_key'
import { INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1 } from '#modules/tasks/domain/task-authoring/task_contract_change_classifier'
import {
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
    workFieldProvenance: contract ? {} : null,
    supportingReferences:
      contract?.resolvedContract.supportingReferences ??
      TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract.supportingReferences,
    readiness:
      contract?.resolvedContract.readiness ??
      TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract.readiness,
    readinessFindingCodesResolved: [],
  }
}

function key(overrides: Partial<Parameters<typeof buildTaskResolvedBriefCacheKey>[0]> = {}) {
  return buildTaskResolvedBriefCacheKey({
    organizationId: 'org-a',
    taskId: TASK_SPECIFICATION_VERSION_V1_FIXTURE.taskId,
    audience: 'work_participant',
    bundle: bundle(),
    ...overrides,
  })
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
    workFieldProvenance: {},
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
  idempotencyKey: 'cache-assignment-v1',
  replayed: false,
}

test.group('Task resolved brief cache key', () => {
  test('partitions immutable projections by tenant, task, audience and resolved hash', ({
    assert,
  }) => {
    const base = key()

    assert.notEqual(base, key({ organizationId: 'org-b' }))
    assert.notEqual(base, key({ taskId: '00000000-0000-4000-8000-000000000099' }))
    assert.notEqual(base, key({ audience: 'creator_edit' }))
    assert.include(
      base,
      TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract.resolvedContentHash.slice('sha256:'.length)
    )
  })

  test('draft and legacy tokens cannot collide with a published Contract', ({ assert }) => {
    const published = key()
    const draft = key({ bundle: bundle(null) })
    const legacy = key({ bundle: null })

    assert.notEqual(published, draft)
    assert.notEqual(published, legacy)
    assert.notEqual(draft, legacy)
    assert.include(draft, TASK_SPECIFICATION_VERSION_V1_FIXTURE.id)
    assert.match(legacy, /:version:legacy$/)
  })

  test('assignment-pinned cache identity ignores later mutable authoring heads', ({ assert }) => {
    const pinned = key({ assignmentSnapshot, bundle: bundle() })
    const pinnedAfterDraftChange = key({ assignmentSnapshot, bundle: bundle(null) })

    assert.equal(pinnedAfterDraftChange, pinned)
    assert.include(pinned, assignmentSnapshot.id)
    assert.include(pinned, assignmentSnapshot.snapshotHash.slice('sha256:'.length))
  })

  test('assignment-pinned cache identity changes when acknowledgement state changes', ({
    assert,
  }) => {
    const pending = key({ assignmentSnapshot })
    const acknowledged = key({
      assignmentSnapshot: { ...assignmentSnapshot, acknowledgementState: 'acknowledged' },
    })

    assert.notEqual(pending, acknowledged)
  })

  test('a missing assignment snapshot is isolated by the actor-bound assignment access id', ({
    assert,
  }) => {
    const firstAssignment = key({
      assignmentSnapshot: null,
      assignmentAccessId: '00000000-0000-4000-8000-000000000101',
    })
    const secondAssignment = key({
      assignmentSnapshot: null,
      assignmentAccessId: '00000000-0000-4000-8000-000000000102',
    })

    assert.notEqual(firstAssignment, secondAssignment)
    assert.include(firstAssignment, '00000000-0000-4000-8000-000000000101')
    assert.include(secondAssignment, '00000000-0000-4000-8000-000000000102')
  })
})
