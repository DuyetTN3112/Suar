import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'

export interface CreateReviewSessionForCompletedAssignmentInput {
  assignmentId: string
  assigneeId: string
}

export interface ReviewSessionCommandRepositoryPort {
  createForCompletedAssignmentIfMissing(
    input: CreateReviewSessionForCompletedAssignmentInput,
    trx?: ReviewTransaction
  ): Promise<boolean>
}
