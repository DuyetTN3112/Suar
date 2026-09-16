import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { ReviewTaskWorkflowSeed } from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import { lockClassicReviewAssignmentGovernance } from '#modules/reviews/infra/adapters/review-core/lucid_classic_review_governance_lock'

type SeedRow =
  | {
      task_id: string
      task_assignment_id: string
      project_id: string
      organization_id: string
      reviewee_id: string | null
      assigner_id: string | null
      creator_id: string
    }
  | undefined

export async function loadWorkflowSeed(
  transaction: TransactionClientContract,
  taskId: string,
  taskAssignmentId: string
): Promise<ReviewTaskWorkflowSeed | null> {
  const loadSeed = () =>
    transaction
      .from('tasks as t')
      .join('task_assignments as ta', 'ta.task_id', 't.id')
      .where('t.id', taskId)
      .where('ta.id', taskAssignmentId)
      .where('ta.assignment_status', 'completed')
      .whereNull('t.deleted_at')
      .select(
        't.id as task_id',
        'ta.id as task_assignment_id',
        't.project_id',
        't.organization_id',
        'ta.assignee_id as reviewee_id',
        't.creator_id',
        'ta.assigned_by as assigner_id'
      )
      .first() as Promise<SeedRow>

  const pointer = await loadSeed()
  if (!pointer) return null
  await lockClassicReviewAssignmentGovernance(transaction, {
    taskId,
    assignmentId: taskAssignmentId,
    ...(pointer.reviewee_id ? { expectedAssigneeId: pointer.reviewee_id } : {}),
    expectedAssignmentStatus: 'completed',
  })
  const seed = await loadSeed()

  return seed
    ? {
        taskId: seed.task_id,
        taskAssignmentId: seed.task_assignment_id,
        projectId: seed.project_id,
        organizationId: seed.organization_id,
        revieweeId: seed.reviewee_id,
        assignerId: seed.assigner_id,
        creatorId: seed.creator_id,
      }
    : null
}
