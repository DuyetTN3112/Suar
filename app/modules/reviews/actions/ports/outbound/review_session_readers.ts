import type { FlaggedReviewModerationSource } from '#modules/reviews/actions/mappers/flagged_review_moderation_projection_mapper'
import type { ReviewSessionProjectionSource } from '#modules/reviews/actions/mappers/review_session_projection_mapper'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'
import type {
  ReviewEvidenceRecord,
  ReviewSessionRecord,
  ReviewSessionReviewerAssignmentRecord,
  TaskSelfAssessmentRecord,
} from '#modules/reviews/types/review_records'

export interface ReviewSessionActorAccess {
  sessionExists: boolean
  sessionId: string
  sessionRevieweeId: string
  sessionTaskOrgId: string
  sessionTaskProjectId: string | null
  sessionTaskId: string
  sessionTaskAssignmentId: string
  managerReviewerIds: string[]
  peerReviewerIds: string[]
  isOrgAdminOrOwner: boolean
}

export interface ReviewEvidencePage {
  data: ReviewEvidenceRecord[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export interface ReviewSessionIdentity {
  taskAssignmentId: string
  revieweeId: string
}

export interface ReviewSessionConfirmationSource {
  revieweeId: string
  confirmations: ReviewConfirmationEntry[]
}

export interface PendingReviewSessionSource extends ReviewSessionRecord {
  reviewer_assignments: ReviewSessionReviewerAssignmentRecord[]
}

export interface PendingReviewSessionWindow {
  data: PendingReviewSessionSource[]
  total: number
  nextCursor: string | null
  previousCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface RevieweeSessionPage {
  data: ReviewSessionProjectionSource[]
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

export interface ReviewSessionReadStore {
  loadActorAccess(
    sessionId: string,
    actorId: string,
    transaction?: ReviewTransaction
  ): Promise<ReviewSessionActorAccess | null>

  paginateEvidence(
    sessionId: string,
    input: { page: number; perPage: number },
    transaction?: ReviewTransaction
  ): Promise<ReviewEvidencePage>

  findProjectionSource(
    sessionId: string,
    transaction?: ReviewTransaction
  ): Promise<ReviewSessionProjectionSource>

  findIdentity(
    sessionId: string,
    transaction?: ReviewTransaction
  ): Promise<ReviewSessionIdentity | null>

  findConfirmationSource(
    sessionId: string,
    transaction?: ReviewTransaction
  ): Promise<ReviewSessionConfirmationSource | null>

  findSelfAssessment(
    taskAssignmentId: string,
    revieweeId: string,
    transaction?: ReviewTransaction
  ): Promise<TaskSelfAssessmentRecord | null>

  findPendingForReviewer(
    reviewerId: string,
    projectTaskAssignmentIds: string[],
    input: {
      limit: number
      after: string | null
      before: string | null
    }
  ): Promise<PendingReviewSessionWindow>

  paginateByReviewee(
    revieweeId: string,
    page: number,
    perPage: number
  ): Promise<RevieweeSessionPage>
}

export interface FlaggedReviewPage {
  data: FlaggedReviewModerationSource[]
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  nextCursor: string | null
  previousCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ReviewFlaggedReviewReader {
  paginate(
    page: number,
    perPage: number,
    status?: string,
    after?: string,
    before?: string
  ): Promise<FlaggedReviewPage>
}
