import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import { lockClassicReviewAssignmentGovernance } from '#modules/reviews/infra/adapters/review-core/lucid_classic_review_governance_lock'

interface TaskReviewWorkflowPointerRow {
  id: string
  task_id: string
  task_assignment_id: string | null
  reviewee_id: string | null
}

export interface LockedTaskReviewWorkflowGovernance {
  workflowId: string
  taskId: string
  taskAssignmentId: string | null
  revieweeId: string | null
  legacyUnpinned: boolean
}

function integrityFailure(
  message: string,
  details: Record<string, unknown>
): PersistedDataIntegrityException {
  return new PersistedDataIntegrityException(message, {
    boundary: 'task_review_workflow_assignment_governance',
    ...details,
  })
}

/**
 * Locks a task-review workflow in the same global order used by Assignment
 * Contract persistence. Native rows use Task -> advisory assignment ->
 * TaskAssignment -> workflow. Explicit legacy rows use Task -> workflow and
 * remain distinguishable so callers cannot mistake them for native evidence.
 */
export async function lockTaskReviewWorkflowGovernance(
  trx: TransactionClientContract,
  workflowId: string
): Promise<LockedTaskReviewWorkflowGovernance | null> {
  const pointer = (await trx
    .from('task_review_workflows')
    .where('id', workflowId)
    .select('id', 'task_id', 'task_assignment_id', 'reviewee_id')
    .first()) as TaskReviewWorkflowPointerRow | undefined
  if (!pointer) return null

  if (pointer.task_assignment_id === null) {
    const task = (await trx
      .from('tasks')
      .where('id', pointer.task_id)
      .forUpdate()
      .select('id')
      .first()) as { id: string } | undefined
    if (!task) {
      throw integrityFailure('Legacy task review workflow references a missing task', {
        workflowId,
        taskId: pointer.task_id,
      })
    }
  } else {
    if (!pointer.reviewee_id) {
      throw integrityFailure('Native task review workflow is missing its reviewee', {
        workflowId,
        taskId: pointer.task_id,
        taskAssignmentId: pointer.task_assignment_id,
      })
    }
    await lockClassicReviewAssignmentGovernance(trx, {
      taskId: pointer.task_id,
      assignmentId: pointer.task_assignment_id,
      expectedAssigneeId: pointer.reviewee_id,
    })
  }

  const locked = (await trx
    .from('task_review_workflows')
    .where('id', workflowId)
    .forUpdate()
    .select('id', 'task_id', 'task_assignment_id', 'reviewee_id')
    .first()) as TaskReviewWorkflowPointerRow | undefined
  if (
    !locked ||
    locked.task_id !== pointer.task_id ||
    locked.task_assignment_id !== pointer.task_assignment_id ||
    locked.reviewee_id !== pointer.reviewee_id
  ) {
    throw integrityFailure('Task review workflow crossed its locked assignment boundary', {
      workflowId,
      expectedTaskId: pointer.task_id,
      expectedAssignmentId: pointer.task_assignment_id,
      expectedRevieweeId: pointer.reviewee_id,
      actualTaskId: locked?.task_id ?? null,
      actualAssignmentId: locked?.task_assignment_id ?? null,
      actualRevieweeId: locked?.reviewee_id ?? null,
    })
  }

  return {
    workflowId: locked.id,
    taskId: locked.task_id,
    taskAssignmentId: locked.task_assignment_id,
    revieweeId: locked.reviewee_id,
    legacyUnpinned: locked.task_assignment_id === null,
  }
}
