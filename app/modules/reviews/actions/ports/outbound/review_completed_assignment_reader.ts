import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'

export interface ReviewCompletedAssignment {
  id: string
  taskId: string
  assigneeId: string
  taskCreatorId: string
}

export abstract class ReviewCompletedAssignmentReader {
  abstract findCompletedAssignment(
    assignmentId: string,
    trx?: ReviewTransaction
  ): Promise<ReviewCompletedAssignment | null>
}
