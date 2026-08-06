import type { TvaChangeClass } from '#modules/tasks/public_contracts/task-authoring/primitives'

/**
 * Stable machine codes used by command/HTTP adapters. Keep transport messages outside this kernel so
 * retries and clients can branch on codes without depending on copy or localization.
 */
export const TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES = Object.freeze({
  acknowledgementRecorded: 'TVA.ASSIGNMENT.ACKNOWLEDGEMENT_RECORDED',
  acknowledgementIdempotentReplay: 'TVA.ASSIGNMENT.ACKNOWLEDGEMENT_IDEMPOTENT_REPLAY',
  clarificationRecorded: 'TVA.ASSIGNMENT.CLARIFICATION_RECORDED',
  assigneeOnly: 'TVA.ASSIGNMENT.ASSIGNEE_ONLY',
  assigneeDeactivated: 'TVA.ASSIGNMENT.ASSIGNEE_DEACTIVATED',
  taskCancelled: 'TVA.ASSIGNMENT.TASK_CANCELLED',
  assignmentCancelled: 'TVA.ASSIGNMENT.ASSIGNMENT_CANCELLED',
  assignmentCompleted: 'TVA.ASSIGNMENT.ASSIGNMENT_COMPLETED',
  assignmentSuperseded: 'TVA.ASSIGNMENT.ASSIGNMENT_SUPERSEDED',
  acknowledgementNotRequired: 'TVA.ASSIGNMENT.ACKNOWLEDGEMENT_NOT_REQUIRED',
  clarificationUnresolved: 'TVA.ASSIGNMENT.CLARIFICATION_UNRESOLVED',
  snapshotIdStale: 'TVA.ASSIGNMENT.SNAPSHOT_ID_STALE',
  snapshotHashStale: 'TVA.ASSIGNMENT.SNAPSHOT_HASH_STALE',
  snapshotHeadStale: 'TVA.ASSIGNMENT.SNAPSHOT_HEAD_STALE',
  successorIdentityReused: 'TVA.ASSIGNMENT.SUCCESSOR_IDENTITY_REUSED',
  successorHeadStale: 'TVA.ASSIGNMENT.SUCCESSOR_HEAD_STALE',
  successorAcknowledgementRetained: 'TVA.ASSIGNMENT.SUCCESSOR_ACKNOWLEDGEMENT_RETAINED',
  successorReacknowledgementRequired: 'TVA.ASSIGNMENT.SUCCESSOR_REACKNOWLEDGEMENT_REQUIRED',
  reassignmentReacknowledgementRequired:
    'TVA.ASSIGNMENT.REASSIGNMENT_REACKNOWLEDGEMENT_REQUIRED',
  governedSuccessorCycleRequired: 'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED',
  legacyUnpinnedWorkflowProvenanceRequired:
    'TVA.ASSIGNMENT.LEGACY_UNPINNED_WORKFLOW_PROVENANCE_REQUIRED',
} as const)

export type AssignmentAcknowledgementCode =
  (typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES)[keyof typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES]

/**
 * `contractVersionHead` is the monotonically increasing head observed when the immutable snapshot
 * was created. A client must match all three values; the hash alone is not an optimistic-lock token.
 */
export type AssignmentSnapshotIdentity = Readonly<{
  snapshotId: string
  snapshotHash: string
  contractVersionHead: number
}>

export type AssignmentAcknowledgementFact = Readonly<{
  assignmentId: string
  assigneeId: string
  snapshotId: string
  snapshotHash: string
  contractVersionHead: number
  acknowledgedAt: string
}>

export type AssignmentAcknowledgementContext = Readonly<{
  assignmentId: string
  assigneeId: string
  assignmentState: 'active' | 'cancelled' | 'completed' | 'superseded'
  taskState: 'active' | 'cancelled'
  assigneeActive: boolean
  acknowledgementRequired: boolean
  clarificationOpen: boolean
  currentSnapshot: AssignmentSnapshotIdentity
  existingAcknowledgement: AssignmentAcknowledgementFact | null
}>

type AssignmentInteractionRejectionCode =
  | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.assigneeOnly
  | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.assigneeDeactivated
  | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.taskCancelled
  | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.assignmentCancelled
  | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.assignmentCompleted
  | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.assignmentSuperseded
  | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.acknowledgementNotRequired
  | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.clarificationUnresolved
  | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.snapshotIdStale
  | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.snapshotHashStale
  | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.snapshotHeadStale

export type AssignmentAcknowledgementDecision =
  | Readonly<{
      allowed: true
      code:
        | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.acknowledgementRecorded
        | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.acknowledgementIdempotentReplay
      action: 'record' | 'replay'
      fact: AssignmentAcknowledgementFact
    }>
  | Readonly<{
      allowed: false
      code: AssignmentInteractionRejectionCode
      action: 'reject'
      fact: null
    }>

function decideInteractionFence(input: {
  readonly context: AssignmentAcknowledgementContext
  readonly actorId: string
  readonly expectedSnapshot: AssignmentSnapshotIdentity
}): AssignmentInteractionRejectionCode | null {
  const { context, actorId, expectedSnapshot } = input

  // Actor check comes first so a non-assignee cannot use this decision to inspect assignee state.
  if (actorId !== context.assigneeId) {
    return TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.assigneeOnly
  }
  if (!context.assigneeActive) {
    return TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.assigneeDeactivated
  }
  if (context.taskState === 'cancelled') {
    return TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.taskCancelled
  }
  if (context.assignmentState === 'cancelled') {
    return TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.assignmentCancelled
  }
  if (context.assignmentState === 'completed') {
    return TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.assignmentCompleted
  }
  if (context.assignmentState === 'superseded') {
    return TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.assignmentSuperseded
  }
  if (!context.acknowledgementRequired) {
    return TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.acknowledgementNotRequired
  }
  if (expectedSnapshot.snapshotId !== context.currentSnapshot.snapshotId) {
    return TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.snapshotIdStale
  }
  if (expectedSnapshot.snapshotHash !== context.currentSnapshot.snapshotHash) {
    return TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.snapshotHashStale
  }
  if (expectedSnapshot.contractVersionHead !== context.currentSnapshot.contractVersionHead) {
    return TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.snapshotHeadStale
  }

  return null
}

function acknowledgementMatches(
  fact: AssignmentAcknowledgementFact,
  context: AssignmentAcknowledgementContext,
  snapshot: AssignmentSnapshotIdentity
): boolean {
  return (
    fact.assignmentId === context.assignmentId &&
    fact.assigneeId === context.assigneeId &&
    fact.snapshotId === snapshot.snapshotId &&
    fact.snapshotHash === snapshot.snapshotHash &&
    fact.contractVersionHead === snapshot.contractVersionHead
  )
}

export function decideAssignmentAcknowledgement(input: {
  readonly context: AssignmentAcknowledgementContext
  readonly actorId: string
  readonly expectedSnapshot: AssignmentSnapshotIdentity
  readonly acknowledgedAt: string
}): AssignmentAcknowledgementDecision {
  if (input.context.clarificationOpen) {
    return {
      allowed: false,
      code: TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.clarificationUnresolved,
      action: 'reject',
      fact: null,
    }
  }
  const rejectionCode = decideInteractionFence(input)
  if (rejectionCode) {
    return {
      allowed: false,
      code: rejectionCode,
      action: 'reject',
      fact: null,
    }
  }

  const existing = input.context.existingAcknowledgement
  if (existing && acknowledgementMatches(existing, input.context, input.expectedSnapshot)) {
    return {
      allowed: true,
      code: TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.acknowledgementIdempotentReplay,
      action: 'replay',
      fact: existing,
    }
  }

  return {
    allowed: true,
    code: TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.acknowledgementRecorded,
    action: 'record',
    fact: {
      assignmentId: input.context.assignmentId,
      assigneeId: input.context.assigneeId,
      snapshotId: input.expectedSnapshot.snapshotId,
      snapshotHash: input.expectedSnapshot.snapshotHash,
      contractVersionHead: input.expectedSnapshot.contractVersionHead,
      acknowledgedAt: input.acknowledgedAt,
    },
  }
}

export type AssignmentClarificationRequestFact = Readonly<{
  requestId: string
  assignmentId: string
  requestedBy: string
  snapshotId: string
  snapshotHash: string
  contractVersionHead: number
  requestedAt: string
}>

export type AssignmentClarificationDecision =
  | Readonly<{
      allowed: true
      code: typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.clarificationRecorded
      action: 'record_clarification'
      acknowledgementEffect: 'none'
      request: AssignmentClarificationRequestFact
    }>
  | Readonly<{
      allowed: false
      code: AssignmentInteractionRejectionCode
      action: 'reject'
      acknowledgementEffect: 'none'
      request: null
    }>

/**
 * Clarification is an operational fact pinned to the observed snapshot. It deliberately cannot
 * create, replace, revoke, or infer an acknowledgement fact.
 */
export function decideAssignmentClarificationRequest(input: {
  readonly context: AssignmentAcknowledgementContext
  readonly actorId: string
  readonly expectedSnapshot: AssignmentSnapshotIdentity
  readonly requestId: string
  readonly requestedAt: string
}): AssignmentClarificationDecision {
  const rejectionCode = decideInteractionFence(input)
  if (rejectionCode) {
    return {
      allowed: false,
      code: rejectionCode,
      action: 'reject',
      acknowledgementEffect: 'none',
      request: null,
    }
  }

  return {
    allowed: true,
    code: TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.clarificationRecorded,
    action: 'record_clarification',
    acknowledgementEffect: 'none',
    request: {
      requestId: input.requestId,
      assignmentId: input.context.assignmentId,
      requestedBy: input.actorId,
      snapshotId: input.expectedSnapshot.snapshotId,
      snapshotHash: input.expectedSnapshot.snapshotHash,
      contractVersionHead: input.expectedSnapshot.contractVersionHead,
      requestedAt: input.requestedAt,
    },
  }
}

export type AssignmentSuccessorChangeClass = Exclude<TvaChangeClass, 'initial'>
export type AssignmentWorkLifecycle = 'assigned' | 'in_progress' | 'review' | 'dispute'

export type AssignmentSuccessorAcknowledgementDecision = Readonly<{
  allowed: boolean
  code:
    | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.successorIdentityReused
    | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.successorHeadStale
    | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.successorAcknowledgementRetained
    | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.successorReacknowledgementRequired
    | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.reassignmentReacknowledgementRequired
    | typeof TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.governedSuccessorCycleRequired
  action:
    | 'reject'
    | 'retain_acknowledgement'
    | 'require_reacknowledgement'
    | 'governed_cycle'
  acknowledgementState: 'acknowledged' | 'pending_reacknowledgement'
  effectiveSnapshot: AssignmentSnapshotIdentity
  previousSnapshot: AssignmentSnapshotIdentity
}>

const MATERIAL_CHANGE_CLASSES = new Set<AssignmentSuccessorChangeClass>([
  'material_scope',
  'acceptance',
  'evidence',
  'ownership',
  'retrospective',
])

/**
 * Classifies the acknowledgement state of a newly persisted immutable successor. This function
 * never alters either snapshot; persistence must create a new head before applying the decision.
 */
export function decideAssignmentSuccessorAcknowledgement(input: {
  readonly previousSnapshot: AssignmentSnapshotIdentity
  readonly successorSnapshot: AssignmentSnapshotIdentity
  readonly changeClass: AssignmentSuccessorChangeClass
  readonly workLifecycle: AssignmentWorkLifecycle
  readonly assigneeChanged: boolean
  readonly clarificationRequiresReacknowledgement: boolean
}): AssignmentSuccessorAcknowledgementDecision {
  const base = {
    effectiveSnapshot: input.successorSnapshot,
    previousSnapshot: input.previousSnapshot,
  } as const

  if (
    input.successorSnapshot.snapshotId === input.previousSnapshot.snapshotId ||
    input.successorSnapshot.snapshotHash === input.previousSnapshot.snapshotHash
  ) {
    return {
      allowed: false,
      code: TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.successorIdentityReused,
      action: 'reject',
      acknowledgementState: 'acknowledged',
      ...base,
    }
  }

  if (
    input.successorSnapshot.contractVersionHead !==
    input.previousSnapshot.contractVersionHead + 1
  ) {
    return {
      allowed: false,
      code: TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.successorHeadStale,
      action: 'reject',
      acknowledgementState: 'acknowledged',
      ...base,
    }
  }

  const reacknowledgementRequired =
    input.assigneeChanged ||
    MATERIAL_CHANGE_CLASSES.has(input.changeClass) ||
    (input.changeClass === 'clarification' && input.clarificationRequiresReacknowledgement)

  if (
    reacknowledgementRequired &&
    (input.workLifecycle === 'review' || input.workLifecycle === 'dispute')
  ) {
    return {
      allowed: false,
      code: TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.governedSuccessorCycleRequired,
      action: 'governed_cycle',
      acknowledgementState: 'pending_reacknowledgement',
      ...base,
    }
  }

  if (input.assigneeChanged) {
    return {
      allowed: true,
      code: TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.reassignmentReacknowledgementRequired,
      action: 'require_reacknowledgement',
      acknowledgementState: 'pending_reacknowledgement',
      ...base,
    }
  }

  if (reacknowledgementRequired) {
    return {
      allowed: true,
      code: TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.successorReacknowledgementRequired,
      action: 'require_reacknowledgement',
      acknowledgementState: 'pending_reacknowledgement',
      ...base,
    }
  }

  return {
    allowed: true,
    code: TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.successorAcknowledgementRetained,
    action: 'retain_acknowledgement',
    acknowledgementState: 'acknowledged',
    ...base,
  }
}
