import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

export interface LockedClassicReviewAssignmentGovernance {
  taskId: string
  assignmentId: string
  assigneeId: string
  assignmentStatus: string
}

export interface LockedClassicReviewSessionGovernance
  extends LockedClassicReviewAssignmentGovernance {
  reviewSessionId: string
  revieweeId: string
}

export interface LockedClassicReviewDisputeGovernance
  extends LockedClassicReviewSessionGovernance {
  disputeId: string
}

interface AssignmentPointerRow {
  id: string
  task_id: string
  assignee_id: string
  assignment_status: string
}

interface ReviewSessionPointerRow {
  id: string
  task_assignment_id: string
  reviewee_id: string
}

interface ReviewDisputePointerRow {
  id: string
  review_session_id: string
  task_assignment_id: string
  task_id: string
  reviewee_id: string
}

function integrityFailure(
  message: string,
  details: Record<string, unknown>
): PersistedDataIntegrityException {
  return new PersistedDataIntegrityException(message, {
    boundary: 'classic_review_assignment_governance',
    ...details,
  })
}

/**
 * Acquires the same transaction-scoped governance fence as Assignment Contract
 * persistence. Every classic review writer must follow this global order:
 * Task -> assignment advisory lock -> TaskAssignment -> review session -> dispute.
 */
export async function lockClassicReviewAssignmentGovernance(
  trx: TransactionClientContract,
  input: {
    taskId: string
    assignmentId: string
    expectedAssigneeId?: string
    expectedAssignmentStatus?: string
  }
): Promise<LockedClassicReviewAssignmentGovernance> {
  const task = (await trx
    .from('tasks')
    .where('id', input.taskId)
    .forUpdate()
    .select('id')
    .first()) as { id: string } | undefined
  if (!task) {
    throw integrityFailure('Classic review governance references a missing task', input)
  }

  await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
    input.assignmentId,
  ])

  const assignment = (await trx
    .from('task_assignments')
    .where('id', input.assignmentId)
    .forUpdate()
    .select('id', 'task_id', 'assignee_id', 'assignment_status')
    .first()) as AssignmentPointerRow | undefined
  if (
    !assignment ||
    assignment.task_id !== input.taskId ||
    (input.expectedAssigneeId !== undefined &&
      assignment.assignee_id !== input.expectedAssigneeId) ||
    (input.expectedAssignmentStatus !== undefined &&
      assignment.assignment_status !== input.expectedAssignmentStatus)
  ) {
    throw integrityFailure(
      'Classic review governance does not match the durable task assignment',
      {
        ...input,
        actualTaskId: assignment?.task_id ?? null,
        actualAssigneeId: assignment?.assignee_id ?? null,
        actualAssignmentStatus: assignment?.assignment_status ?? null,
      }
    )
  }

  return {
    taskId: assignment.task_id,
    assignmentId: assignment.id,
    assigneeId: assignment.assignee_id,
    assignmentStatus: assignment.assignment_status,
  }
}

export async function lockClassicReviewAssignmentGovernanceByAssignmentId(
  trx: TransactionClientContract,
  input: {
    assignmentId: string
    expectedAssigneeId?: string
    expectedAssignmentStatus?: string
  }
): Promise<LockedClassicReviewAssignmentGovernance> {
  // Pointer lookup is intentionally non-locking. It only discovers the Task that
  // must be locked first; the assignment is authoritatively reread afterwards.
  const pointer = (await trx
    .from('task_assignments')
    .where('id', input.assignmentId)
    .select('task_id')
    .first()) as { task_id: string } | undefined
  if (!pointer) {
    throw integrityFailure('Classic review governance references a missing assignment', input)
  }

  return lockClassicReviewAssignmentGovernance(trx, {
    taskId: pointer.task_id,
    ...input,
  })
}

export async function lockClassicReviewSessionGovernance(
  trx: TransactionClientContract,
  reviewSessionId: string
): Promise<LockedClassicReviewSessionGovernance | null> {
  const pointer = (await trx
    .from('review_sessions')
    .where('id', reviewSessionId)
    .select('id', 'task_assignment_id', 'reviewee_id')
    .first()) as ReviewSessionPointerRow | undefined
  if (!pointer) return null

  const assignment = await lockClassicReviewAssignmentGovernanceByAssignmentId(trx, {
    assignmentId: pointer.task_assignment_id,
    expectedAssigneeId: pointer.reviewee_id,
  })
  const lockedSession = (await trx
    .from('review_sessions')
    .where('id', reviewSessionId)
    .forUpdate()
    .select('id', 'task_assignment_id', 'reviewee_id')
    .first()) as ReviewSessionPointerRow | undefined
  if (
    !lockedSession ||
    lockedSession.task_assignment_id !== pointer.task_assignment_id ||
    lockedSession.task_assignment_id !== assignment.assignmentId ||
    lockedSession.reviewee_id !== pointer.reviewee_id ||
    lockedSession.reviewee_id !== assignment.assigneeId
  ) {
    throw integrityFailure('Review session crossed its locked assignment boundary', {
      reviewSessionId,
      expectedAssignmentId: assignment.assignmentId,
      expectedRevieweeId: assignment.assigneeId,
      actualAssignmentId: lockedSession?.task_assignment_id ?? null,
      actualRevieweeId: lockedSession?.reviewee_id ?? null,
    })
  }

  return {
    ...assignment,
    reviewSessionId: lockedSession.id,
    revieweeId: lockedSession.reviewee_id,
  }
}

export async function lockClassicReviewDisputeGovernance(
  trx: TransactionClientContract,
  disputeId: string
): Promise<LockedClassicReviewDisputeGovernance | null> {
  const pointer = (await trx
    .from('review_disputes')
    .where('id', disputeId)
    .select('id', 'review_session_id', 'task_assignment_id', 'task_id', 'reviewee_id')
    .first()) as ReviewDisputePointerRow | undefined
  if (!pointer) return null

  const assignment = await lockClassicReviewAssignmentGovernance(trx, {
    taskId: pointer.task_id,
    assignmentId: pointer.task_assignment_id,
    expectedAssigneeId: pointer.reviewee_id,
  })
  const lockedSession = (await trx
    .from('review_sessions')
    .where('id', pointer.review_session_id)
    .forUpdate()
    .select('id', 'task_assignment_id', 'reviewee_id')
    .first()) as ReviewSessionPointerRow | undefined
  if (
    !lockedSession ||
    lockedSession.task_assignment_id !== assignment.assignmentId ||
    lockedSession.reviewee_id !== assignment.assigneeId
  ) {
    throw integrityFailure('Review dispute references a foreign review session', {
      disputeId,
      reviewSessionId: pointer.review_session_id,
      expectedAssignmentId: assignment.assignmentId,
      expectedRevieweeId: assignment.assigneeId,
      actualAssignmentId: lockedSession?.task_assignment_id ?? null,
      actualRevieweeId: lockedSession?.reviewee_id ?? null,
    })
  }

  const lockedDispute = (await trx
    .from('review_disputes')
    .where('id', disputeId)
    .forUpdate()
    .select('id', 'review_session_id', 'task_assignment_id', 'task_id', 'reviewee_id')
    .first()) as ReviewDisputePointerRow | undefined
  if (
    !lockedDispute ||
    lockedDispute.review_session_id !== pointer.review_session_id ||
    lockedDispute.review_session_id !== lockedSession.id ||
    lockedDispute.task_assignment_id !== pointer.task_assignment_id ||
    lockedDispute.task_assignment_id !== assignment.assignmentId ||
    lockedDispute.task_id !== pointer.task_id ||
    lockedDispute.task_id !== assignment.taskId ||
    lockedDispute.reviewee_id !== pointer.reviewee_id ||
    lockedDispute.reviewee_id !== assignment.assigneeId
  ) {
    throw integrityFailure('Review dispute crossed its locked task-assignment boundary', {
      disputeId,
      expectedTaskId: assignment.taskId,
      expectedAssignmentId: assignment.assignmentId,
      expectedReviewSessionId: lockedSession.id,
      expectedRevieweeId: assignment.assigneeId,
      actualTaskId: lockedDispute?.task_id ?? null,
      actualAssignmentId: lockedDispute?.task_assignment_id ?? null,
      actualReviewSessionId: lockedDispute?.review_session_id ?? null,
      actualRevieweeId: lockedDispute?.reviewee_id ?? null,
    })
  }

  return {
    ...assignment,
    reviewSessionId: lockedSession.id,
    revieweeId: lockedSession.reviewee_id,
    disputeId: lockedDispute.id,
  }
}
