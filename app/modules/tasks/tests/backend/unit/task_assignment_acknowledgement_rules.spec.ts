import { test } from '@japa/runner'

import {
  decideAssignmentAcknowledgement,
  decideAssignmentClarificationRequest,
  decideAssignmentSuccessorAcknowledgement,
  type AssignmentAcknowledgementContext,
  type AssignmentSnapshotIdentity,
} from '#modules/tasks/domain/task-assignment/task_assignment_acknowledgement_rules'

const ASSIGNMENT_ID = '00000000-0000-4000-8000-000000000001'
const ASSIGNEE_ID = '00000000-0000-4000-8000-000000000002'
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000003'
const ACKNOWLEDGED_AT = '2026-08-01T08:00:00.000Z'
const REQUESTED_AT = '2026-08-01T08:05:00.000Z'

function hash(character: string): string {
  return `sha256:${character.repeat(64)}`
}

const SNAPSHOT_V1: AssignmentSnapshotIdentity = Object.freeze({
  snapshotId: '00000000-0000-4000-8000-000000000010',
  snapshotHash: hash('1'),
  contractVersionHead: 1,
})

const SNAPSHOT_V2: AssignmentSnapshotIdentity = Object.freeze({
  snapshotId: '00000000-0000-4000-8000-000000000011',
  snapshotHash: hash('2'),
  contractVersionHead: 2,
})

function context(
  overrides: Partial<AssignmentAcknowledgementContext> = {}
): AssignmentAcknowledgementContext {
  return {
    assignmentId: ASSIGNMENT_ID,
    assigneeId: ASSIGNEE_ID,
    assignmentState: 'active',
    taskState: 'active',
    assigneeActive: true,
    acknowledgementRequired: true,
    clarificationOpen: false,
    currentSnapshot: SNAPSHOT_V1,
    existingAcknowledgement: null,
    ...overrides,
  }
}

test.group('Unit | Task assignment acknowledgement rules', () => {
  test('records an immutable acknowledgement fact only for the exact snapshot id, hash, and head', ({
    assert,
  }) => {
    const decision = decideAssignmentAcknowledgement({
      context: context(),
      actorId: ASSIGNEE_ID,
      expectedSnapshot: SNAPSHOT_V1,
      acknowledgedAt: ACKNOWLEDGED_AT,
    })

    assert.deepEqual(decision, {
      allowed: true,
      code: 'TVA.ASSIGNMENT.ACKNOWLEDGEMENT_RECORDED',
      action: 'record',
      fact: {
        assignmentId: ASSIGNMENT_ID,
        assigneeId: ASSIGNEE_ID,
        snapshotId: SNAPSHOT_V1.snapshotId,
        snapshotHash: SNAPSHOT_V1.snapshotHash,
        contractVersionHead: 1,
        acknowledgedAt: ACKNOWLEDGED_AT,
      },
    })
  })

  test('allows only the current assignee to acknowledge', ({ assert }) => {
    const decision = decideAssignmentAcknowledgement({
      context: context(),
      actorId: OTHER_USER_ID,
      expectedSnapshot: SNAPSHOT_V1,
      acknowledgedAt: ACKNOWLEDGED_AT,
    })

    assert.deepEqual(decision, {
      allowed: false,
      code: 'TVA.ASSIGNMENT.ASSIGNEE_ONLY',
      action: 'reject',
      fact: null,
    })
  })

  test('rejects each stale component without accepting a partially matching snapshot', ({ assert }) => {
    const scenarios = [
      {
        expected: { ...SNAPSHOT_V1, snapshotId: SNAPSHOT_V2.snapshotId },
        code: 'TVA.ASSIGNMENT.SNAPSHOT_ID_STALE',
      },
      {
        expected: { ...SNAPSHOT_V1, snapshotHash: SNAPSHOT_V2.snapshotHash },
        code: 'TVA.ASSIGNMENT.SNAPSHOT_HASH_STALE',
      },
      {
        expected: { ...SNAPSHOT_V1, contractVersionHead: 2 },
        code: 'TVA.ASSIGNMENT.SNAPSHOT_HEAD_STALE',
      },
    ] as const

    for (const scenario of scenarios) {
      const decision = decideAssignmentAcknowledgement({
        context: context(),
        actorId: ASSIGNEE_ID,
        expectedSnapshot: scenario.expected,
        acknowledgedAt: ACKNOWLEDGED_AT,
      })

      assert.deepEqual(decision, {
        allowed: false,
        code: scenario.code,
        action: 'reject',
        fact: null,
      })
    }
  })

  test('returns the original fact for an exact acknowledgement retry', ({ assert }) => {
    const existingAcknowledgement = {
      assignmentId: ASSIGNMENT_ID,
      assigneeId: ASSIGNEE_ID,
      snapshotId: SNAPSHOT_V1.snapshotId,
      snapshotHash: SNAPSHOT_V1.snapshotHash,
      contractVersionHead: SNAPSHOT_V1.contractVersionHead,
      acknowledgedAt: ACKNOWLEDGED_AT,
    }

    const decision = decideAssignmentAcknowledgement({
      context: context({ existingAcknowledgement }),
      actorId: ASSIGNEE_ID,
      expectedSnapshot: SNAPSHOT_V1,
      acknowledgedAt: '2026-08-01T09:00:00.000Z',
    })

    assert.deepEqual(decision, {
      allowed: true,
      code: 'TVA.ASSIGNMENT.ACKNOWLEDGEMENT_IDEMPOTENT_REPLAY',
      action: 'replay',
      fact: existingAcknowledgement,
    })
  })

  test('does not replay an old acknowledgement for an exact material successor', ({ assert }) => {
    const decision = decideAssignmentAcknowledgement({
      context: context({
        currentSnapshot: SNAPSHOT_V2,
        existingAcknowledgement: {
          assignmentId: ASSIGNMENT_ID,
          assigneeId: ASSIGNEE_ID,
          snapshotId: SNAPSHOT_V1.snapshotId,
          snapshotHash: SNAPSHOT_V1.snapshotHash,
          contractVersionHead: SNAPSHOT_V1.contractVersionHead,
          acknowledgedAt: ACKNOWLEDGED_AT,
        },
      }),
      actorId: ASSIGNEE_ID,
      expectedSnapshot: SNAPSHOT_V2,
      acknowledgedAt: '2026-08-01T09:00:00.000Z',
    })

    assert.equal(decision.code, 'TVA.ASSIGNMENT.ACKNOWLEDGEMENT_RECORDED')
    assert.equal(decision.action, 'record')
    assert.equal(decision.fact?.snapshotId, SNAPSHOT_V2.snapshotId)
    assert.equal(decision.fact?.contractVersionHead, 2)
  })

  test('does not accept the Contract while a clarification remains unresolved', ({ assert }) => {
    const decision = decideAssignmentAcknowledgement({
      context: context({ clarificationOpen: true }),
      actorId: ASSIGNEE_ID,
      expectedSnapshot: SNAPSHOT_V1,
      acknowledgedAt: ACKNOWLEDGED_AT,
    })

    assert.equal(decision.allowed, false)
    assert.equal(decision.code, 'TVA.ASSIGNMENT.CLARIFICATION_UNRESOLVED')
  })

  test('rejects acknowledgement after cancellation, supersession, or assignee deactivation', ({
    assert,
  }) => {
    const scenarios = [
      {
        state: context({ taskState: 'cancelled' }),
        code: 'TVA.ASSIGNMENT.TASK_CANCELLED',
      },
      {
        state: context({ assignmentState: 'cancelled' }),
        code: 'TVA.ASSIGNMENT.ASSIGNMENT_CANCELLED',
      },
      {
        state: context({ assignmentState: 'completed' }),
        code: 'TVA.ASSIGNMENT.ASSIGNMENT_COMPLETED',
      },
      {
        state: context({ assignmentState: 'superseded' }),
        code: 'TVA.ASSIGNMENT.ASSIGNMENT_SUPERSEDED',
      },
      {
        state: context({ assigneeActive: false }),
        code: 'TVA.ASSIGNMENT.ASSIGNEE_DEACTIVATED',
      },
      {
        state: context({ acknowledgementRequired: false }),
        code: 'TVA.ASSIGNMENT.ACKNOWLEDGEMENT_NOT_REQUIRED',
      },
    ] as const

    for (const scenario of scenarios) {
      const decision = decideAssignmentAcknowledgement({
        context: scenario.state,
        actorId: ASSIGNEE_ID,
        expectedSnapshot: SNAPSHOT_V1,
        acknowledgedAt: ACKNOWLEDGED_AT,
      })

      assert.deepEqual(decision, {
        allowed: false,
        code: scenario.code,
        action: 'reject',
        fact: null,
      })
    }
  })

  test('requires the new assignee to acknowledge after reassignment and preserves the old fact', ({
    assert,
  }) => {
    const oldFact = {
      assignmentId: ASSIGNMENT_ID,
      assigneeId: ASSIGNEE_ID,
      snapshotId: SNAPSHOT_V1.snapshotId,
      snapshotHash: SNAPSHOT_V1.snapshotHash,
      contractVersionHead: SNAPSHOT_V1.contractVersionHead,
      acknowledgedAt: ACKNOWLEDGED_AT,
    }
    const reassigned = context({
      assigneeId: OTHER_USER_ID,
      currentSnapshot: SNAPSHOT_V2,
      existingAcknowledgement: oldFact,
    })

    const oldActorDecision = decideAssignmentAcknowledgement({
      context: reassigned,
      actorId: ASSIGNEE_ID,
      expectedSnapshot: SNAPSHOT_V2,
      acknowledgedAt: REQUESTED_AT,
    })
    const newActorDecision = decideAssignmentAcknowledgement({
      context: reassigned,
      actorId: OTHER_USER_ID,
      expectedSnapshot: SNAPSHOT_V2,
      acknowledgedAt: REQUESTED_AT,
    })

    assert.equal(oldActorDecision.code, 'TVA.ASSIGNMENT.ASSIGNEE_ONLY')
    assert.equal(newActorDecision.code, 'TVA.ASSIGNMENT.ACKNOWLEDGEMENT_RECORDED')
    assert.notDeepEqual(newActorDecision.fact, oldFact)
    assert.equal(oldFact.assigneeId, ASSIGNEE_ID)
  })
})

test.group('Unit | Task assignment clarification rules', () => {
  test('records a clarification request without creating or implying acknowledgement', ({ assert }) => {
    const decision = decideAssignmentClarificationRequest({
      context: context(),
      actorId: ASSIGNEE_ID,
      expectedSnapshot: SNAPSHOT_V1,
      requestId: 'clarification-1',
      requestedAt: REQUESTED_AT,
    })

    assert.deepEqual(decision, {
      allowed: true,
      code: 'TVA.ASSIGNMENT.CLARIFICATION_RECORDED',
      action: 'record_clarification',
      acknowledgementEffect: 'none',
      request: {
        requestId: 'clarification-1',
        assignmentId: ASSIGNMENT_ID,
        requestedBy: ASSIGNEE_ID,
        snapshotId: SNAPSHOT_V1.snapshotId,
        snapshotHash: SNAPSHOT_V1.snapshotHash,
        contractVersionHead: SNAPSHOT_V1.contractVersionHead,
        requestedAt: REQUESTED_AT,
      },
    })
  })

  test('never turns clarification into a new acknowledgement when a historical ack exists', ({
    assert,
  }) => {
    const existingAcknowledgement = {
      assignmentId: ASSIGNMENT_ID,
      assigneeId: ASSIGNEE_ID,
      snapshotId: SNAPSHOT_V1.snapshotId,
      snapshotHash: SNAPSHOT_V1.snapshotHash,
      contractVersionHead: SNAPSHOT_V1.contractVersionHead,
      acknowledgedAt: ACKNOWLEDGED_AT,
    }
    const decision = decideAssignmentClarificationRequest({
      context: context({ existingAcknowledgement }),
      actorId: ASSIGNEE_ID,
      expectedSnapshot: SNAPSHOT_V1,
      requestId: 'clarification-2',
      requestedAt: REQUESTED_AT,
    })

    assert.equal(decision.acknowledgementEffect, 'none')
    assert.equal(decision.action, 'record_clarification')
    assert.deepEqual(existingAcknowledgement, context({ existingAcknowledgement }).existingAcknowledgement)
  })

  test('uses the same assignee, lifecycle, and exact-snapshot fence as acknowledgement', ({
    assert,
  }) => {
    const outsider = decideAssignmentClarificationRequest({
      context: context(),
      actorId: OTHER_USER_ID,
      expectedSnapshot: SNAPSHOT_V1,
      requestId: 'clarification-outsider',
      requestedAt: REQUESTED_AT,
    })
    const stale = decideAssignmentClarificationRequest({
      context: context(),
      actorId: ASSIGNEE_ID,
      expectedSnapshot: SNAPSHOT_V2,
      requestId: 'clarification-stale',
      requestedAt: REQUESTED_AT,
    })

    assert.equal(outsider.code, 'TVA.ASSIGNMENT.ASSIGNEE_ONLY')
    assert.equal(stale.code, 'TVA.ASSIGNMENT.SNAPSHOT_ID_STALE')
    assert.equal(outsider.request, null)
    assert.equal(stale.request, null)
  })
})

test.group('Unit | Assignment successor acknowledgement state', () => {
  test('requires re-ack for every material successor and never mutates the prior snapshot', ({
    assert,
  }) => {
    for (const changeClass of ['material_scope', 'acceptance', 'evidence', 'ownership'] as const) {
      const previousBefore = structuredClone(SNAPSHOT_V1)
      const decision = decideAssignmentSuccessorAcknowledgement({
        previousSnapshot: SNAPSHOT_V1,
        successorSnapshot: SNAPSHOT_V2,
        changeClass,
        workLifecycle: 'in_progress',
        assigneeChanged: false,
        clarificationRequiresReacknowledgement: false,
      })

      assert.deepEqual(decision, {
        allowed: true,
        code: 'TVA.ASSIGNMENT.SUCCESSOR_REACKNOWLEDGEMENT_REQUIRED',
        action: 'require_reacknowledgement',
        acknowledgementState: 'pending_reacknowledgement',
        effectiveSnapshot: SNAPSHOT_V2,
        previousSnapshot: SNAPSHOT_V1,
      })
      assert.deepEqual(SNAPSHOT_V1, previousBefore)
    }
  })

  test('retains acknowledgement for non-material successors unless clarification policy opts in', ({
    assert,
  }) => {
    for (const changeClass of ['editorial', 'clarification', 'deadline_priority'] as const) {
      const decision = decideAssignmentSuccessorAcknowledgement({
        previousSnapshot: SNAPSHOT_V1,
        successorSnapshot: SNAPSHOT_V2,
        changeClass,
        workLifecycle: 'in_progress',
        assigneeChanged: false,
        clarificationRequiresReacknowledgement: false,
      })

      assert.equal(decision.code, 'TVA.ASSIGNMENT.SUCCESSOR_ACKNOWLEDGEMENT_RETAINED')
      assert.equal(decision.acknowledgementState, 'acknowledged')
    }

    const optedIn = decideAssignmentSuccessorAcknowledgement({
      previousSnapshot: SNAPSHOT_V1,
      successorSnapshot: SNAPSHOT_V2,
      changeClass: 'clarification',
      workLifecycle: 'in_progress',
      assigneeChanged: false,
      clarificationRequiresReacknowledgement: true,
    })

    assert.equal(optedIn.code, 'TVA.ASSIGNMENT.SUCCESSOR_REACKNOWLEDGEMENT_REQUIRED')
    assert.equal(optedIn.acknowledgementState, 'pending_reacknowledgement')
  })

  test('always requires a new actor acknowledgement after reassignment', ({ assert }) => {
    const decision = decideAssignmentSuccessorAcknowledgement({
      previousSnapshot: SNAPSHOT_V1,
      successorSnapshot: SNAPSHOT_V2,
      changeClass: 'editorial',
      workLifecycle: 'in_progress',
      assigneeChanged: true,
      clarificationRequiresReacknowledgement: false,
    })

    assert.equal(decision.code, 'TVA.ASSIGNMENT.REASSIGNMENT_REACKNOWLEDGEMENT_REQUIRED')
    assert.equal(decision.acknowledgementState, 'pending_reacknowledgement')
  })

  test('requires a governed cycle for a material successor during review or dispute', ({ assert }) => {
    for (const workLifecycle of ['review', 'dispute'] as const) {
      const decision = decideAssignmentSuccessorAcknowledgement({
        previousSnapshot: SNAPSHOT_V1,
        successorSnapshot: SNAPSHOT_V2,
        changeClass: 'material_scope',
        workLifecycle,
        assigneeChanged: false,
        clarificationRequiresReacknowledgement: false,
      })

      assert.equal(decision.allowed, false)
      assert.equal(decision.code, 'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED')
      assert.equal(decision.action, 'governed_cycle')
      assert.equal(decision.acknowledgementState, 'pending_reacknowledgement')
    }
  })

  test('rejects a reused snapshot identity or non-advancing contract head', ({ assert }) => {
    const reused = decideAssignmentSuccessorAcknowledgement({
      previousSnapshot: SNAPSHOT_V1,
      successorSnapshot: SNAPSHOT_V1,
      changeClass: 'material_scope',
      workLifecycle: 'in_progress',
      assigneeChanged: false,
      clarificationRequiresReacknowledgement: false,
    })
    const staleHead = decideAssignmentSuccessorAcknowledgement({
      previousSnapshot: SNAPSHOT_V2,
      successorSnapshot: { ...SNAPSHOT_V1, snapshotId: 'snapshot-new', snapshotHash: hash('3') },
      changeClass: 'material_scope',
      workLifecycle: 'in_progress',
      assigneeChanged: false,
      clarificationRequiresReacknowledgement: false,
    })

    assert.equal(reused.code, 'TVA.ASSIGNMENT.SUCCESSOR_IDENTITY_REUSED')
    assert.equal(staleHead.code, 'TVA.ASSIGNMENT.SUCCESSOR_HEAD_STALE')
  })
})
