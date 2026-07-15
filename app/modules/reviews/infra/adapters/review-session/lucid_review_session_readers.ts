import type {
  FlaggedReviewPage,
  PendingReviewSessionWindow,
  RevieweeSessionPage,
  ReviewFlaggedReviewReader,
  ReviewSessionReadStore,
  ReviewEvidencePage,
  ReviewSessionActorAccess,
  ReviewSessionConfirmationSource,
  ReviewSessionIdentity,
} from '#modules/reviews/actions/ports/outbound/review_session_readers'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import { loadReviewSessionActorAccessContext } from '#modules/reviews/infra/adapters/review-session/lucid_review_session_actor_access_reader'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'
import FlaggedReviewRepository from '#modules/reviews/infra/repositories/review-core/flagged_review_repository'
import ReviewEvidenceRepository from '#modules/reviews/infra/repositories/review-submission/review_evidence_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review-session/review_session_repository'
import TaskSelfAssessmentRepository from '#modules/reviews/infra/repositories/self-assessment/task_self_assessment_repository'
import type { TaskSelfAssessmentRecord } from '#modules/reviews/types/review_records'

export class LucidReviewSessionReadStore implements ReviewSessionReadStore {
  loadActorAccess(
    sessionId: string,
    actorId: string,
    transaction?: ReviewTransaction
  ): Promise<ReviewSessionActorAccess | null> {
    return loadReviewSessionActorAccessContext(
      sessionId,
      actorId,
      toLucidReviewTransaction(transaction)
    )
  }

  paginateEvidence(
    sessionId: string,
    input: { page: number; perPage: number },
    transaction?: ReviewTransaction
  ): Promise<ReviewEvidencePage> {
    return ReviewEvidenceRepository.paginateMergedBySession(
      sessionId,
      input,
      toLucidReviewTransaction(transaction)
    )
  }

  async findProjectionSource(
    sessionId: string,
    transaction?: ReviewTransaction
  ) {
    return ReviewSessionRepository.findByIdWithRelations(
      sessionId,
      toLucidReviewTransaction(transaction)
    )
  }

  async findIdentity(
    sessionId: string,
    transaction?: ReviewTransaction
  ): Promise<ReviewSessionIdentity | null> {
    const session = await ReviewSessionRepository.findById(
      sessionId,
      toLucidReviewTransaction(transaction)
    )
    return session
      ? {
          taskAssignmentId: session.task_assignment_id,
          revieweeId: session.reviewee_id,
        }
      : null
  }

  async findConfirmationSource(
    sessionId: string,
    transaction?: ReviewTransaction
  ): Promise<ReviewSessionConfirmationSource | null> {
    const session = await ReviewSessionRepository.findById(
      sessionId,
      toLucidReviewTransaction(transaction)
    )
    return session
      ? {
          revieweeId: session.reviewee_id,
          confirmations: session.confirmations ?? [],
        }
      : null
  }

  async findSelfAssessment(
    taskAssignmentId: string,
    revieweeId: string,
    transaction?: ReviewTransaction
  ): Promise<TaskSelfAssessmentRecord | null> {
    return TaskSelfAssessmentRepository.findByTaskAssignmentAndUser(
      taskAssignmentId,
      revieweeId,
      toLucidReviewTransaction(transaction)
    )
  }

  async findPendingForReviewer(
    reviewerId: string,
    projectTaskAssignmentIds: string[],
    input: {
      limit: number
      after: string | null
      before: string | null
    }
  ): Promise<PendingReviewSessionWindow> {
    const result = await ReviewSessionRepository.findPendingForReviewerCursor(
      reviewerId,
      projectTaskAssignmentIds,
      input
    )
    return result
  }

  async paginateByReviewee(
    revieweeId: string,
    page: number,
    perPage: number
  ): Promise<RevieweeSessionPage> {
    const result = await ReviewSessionRepository.paginateByReviewee(revieweeId, page, perPage)
    return {
      data: result.all(),
      total: result.total,
      perPage: result.perPage,
      currentPage: result.currentPage,
      lastPage: result.lastPage,
    }
  }
}

export class LucidReviewFlaggedReviewReader implements ReviewFlaggedReviewReader {
  async paginate(
    page: number,
    perPage: number,
    status?: string,
    after?: string,
    before?: string
  ): Promise<FlaggedReviewPage> {
    return (await FlaggedReviewRepository.paginateWithRelations(
      page,
      perPage,
      status,
      after,
      before
    ))
  }
}
