import type { TaskReviewFinalizationSourceReader } from '#modules/reviews/actions/commands/task-review/process_task_review_finalized_event_command'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'

export default class LucidTaskReviewFinalizationSourceReader
  implements TaskReviewFinalizationSourceReader
{
  async findFinalizedTaskReviewWorkflow(
    workflowId: string,
    transaction: ReviewTransaction
  ): Promise<{
    id: string
    status: string
    taskAssignmentId: string | null
    taskId: string
    revieweeId: string | null
    completedAt: Date | string | null
  } | null> {
    const client = toLucidReviewTransaction(transaction)
    const row = (await client
      .from('task_review_workflows')
      .where('id', workflowId)
      .select('id', 'status', 'task_assignment_id', 'task_id', 'reviewee_id', 'completed_at')
      .first()) as
      | {
          id: string
          status: string
          task_assignment_id: string | null
          task_id: string
          reviewee_id: string | null
          completed_at: Date | string | null
        }
      | undefined
    return row
      ? {
          id: row.id,
          status: row.status,
          taskAssignmentId: row.task_assignment_id,
          taskId: row.task_id,
          revieweeId: row.reviewee_id,
          completedAt: row.completed_at,
        }
      : null
  }
}
