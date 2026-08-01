import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { ReviewSessionRecord } from '#modules/reviews/types/review_records'

export interface CreateReviewSessionPersistenceInput {
  taskAssignmentId: string
  revieweeId: string
  creatorReviewerId: string | null
  requiredPeerReviews: number
  requiredTotalReviews: number
  minimumManagerReviews: number
  minimumPeerReviews: number
  deadline: Date
}

export interface ReviewSessionCreationPersistenceSession {
  transaction: ReviewTransaction
  findByTaskAssignment(taskAssignmentId: string): Promise<ReviewSessionRecord | null>
  resolveEffectiveCreatorReviewerId(input: {
    taskAssignmentId: string
    revieweeId: string
    creatorReviewerId: string | null
  }): Promise<string | null>
  create(input: CreateReviewSessionPersistenceInput): Promise<ReviewSessionRecord>
  createReviewerAssignments(session: ReviewSessionRecord): Promise<void>
  writeCreatedAudit(
    execCtx: ReviewActionContext,
    sessionId: string,
    input: { taskAssignmentId: string; revieweeId: string }
  ): Promise<void>
}

export interface ReviewSessionCreationUnitOfWork {
  run<T>(work: (session: ReviewSessionCreationPersistenceSession) => Promise<T>): Promise<T>
}
