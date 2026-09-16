import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export async function createWorkflowReviewers(
  transaction: TransactionClientContract,
  workflowId: string,
  reviewers: ReadonlyArray<{
    reviewerId: string
    role: string
    priorityRank: number
    isRequired?: boolean
  }>
): Promise<void> {
  if (reviewers.length === 0) return

  await transaction.table('task_review_reviewers').insert(
    reviewers.map((reviewer) => ({
      workflow_id: workflowId,
      reviewer_id: reviewer.reviewerId,
      reviewer_role: reviewer.role,
      is_required: reviewer.isRequired ?? true,
      status: 'pending',
      priority_rank: reviewer.priorityRank,
    }))
  )
}

export async function loadTaskAssignee(
  transaction: TransactionClientContract,
  taskId: string
): Promise<string | null | undefined> {
  const task = (await transaction
    .from('tasks')
    .where('id', taskId)
    .whereNull('deleted_at')
    .select('assigned_to')
    .first()) as { assigned_to: string | null } | undefined

  return task?.assigned_to
}

export async function findReviewer(
  transaction: TransactionClientContract,
  workflowId: string,
  reviewerId: string
): Promise<{ id: string; status: string } | null> {
  const reviewer = (await transaction
    .from('task_review_reviewers')
    .where('workflow_id', workflowId)
    .where('reviewer_id', reviewerId)
    .select('id', 'status')
    .first()) as { id: string; status: string } | undefined

  return reviewer ?? null
}

export async function listReviewerIds(
  transaction: TransactionClientContract,
  workflowId: string
): Promise<string[]> {
  const rows = (await transaction
    .from('task_review_reviewers')
    .where('workflow_id', workflowId)
    .select('reviewer_id')) as Array<{ reviewer_id: string }>

  return rows.map((row) => row.reviewer_id)
}

export async function markReviewerSubmitted(
  transaction: TransactionClientContract,
  reviewerId: string,
  reviewedAt: Date
): Promise<void> {
  await transaction.from('task_review_reviewers').where('id', reviewerId).update({
    status: 'submitted',
    reviewed_at: reviewedAt,
    updated_at: reviewedAt,
  })
}

export async function countSubmittedReviewers(
  transaction: TransactionClientContract,
  workflowId: string
): Promise<number> {
  const row = (await transaction
    .from('task_review_reviewers')
    .where('workflow_id', workflowId)
    .where('status', 'submitted')
    .count('* as total')
    .first()) as { total?: number | string } | undefined

  return Number(row?.total ?? 0)
}
