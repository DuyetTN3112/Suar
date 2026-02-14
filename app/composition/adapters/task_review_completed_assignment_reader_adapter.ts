import {
  ReviewCompletedAssignmentReader,
  type ReviewCompletedAssignment,
} from '#modules/reviews/actions/ports/outbound/review_completed_assignment_reader'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/lucid_review_transaction_runner'
import { findCompletedById } from '#modules/tasks/infra/repositories/read/task_assignment_queries'

export class TaskReviewCompletedAssignmentReaderAdapter extends ReviewCompletedAssignmentReader {
  async findCompletedAssignment(
    assignmentId: string,
    trx?: Parameters<ReviewCompletedAssignmentReader['findCompletedAssignment']>[1]
  ): Promise<ReviewCompletedAssignment | null> {
    const assignment = await findCompletedById(assignmentId, toLucidReviewTransaction(trx))
    if (!assignment) {
      return null
    }

    return {
      id: assignment.id,
      taskId: assignment.task_id,
      assigneeId: assignment.assignee_id,
      taskCreatorId: assignment.task.creator_id,
    }
  }
}
