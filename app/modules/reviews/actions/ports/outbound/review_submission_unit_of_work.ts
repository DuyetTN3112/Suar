import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { SkillReviewRecord } from '#modules/reviews/types/review_records'

export type ReviewSubmissionSessionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'disputed'

export interface ReviewSubmissionSessionSnapshot {
  id: string
  taskAssignmentId: string
  revieweeId: string
  status: ReviewSubmissionSessionStatus
  managerReviewCompleted: boolean
  creatorReviewerId: string | null
  creatorReviewCompleted: boolean
  managerReviewsCount: number
  peerReviewsCount: number
  requiredPeerReviews: number
  requiredTotalReviews: number
  minimumManagerReviews: number
  minimumPeerReviews: number
  overallQualityScore: number | null
  deliveryTimeliness: string | null
  requirementAdherence: number | null
  communicationQuality: number | null
  codeQualityScore: number | null
  proactivenessScore: number | null
  wouldWorkWithAgain: boolean | null
  strengthsObserved: string | null
  areasForImprovement: string | null
  completedAt: Date | null
}

export interface ReviewSubmissionActorAccess {
  sessionRevieweeId: string
  managerReviewerIds: string[]
  peerReviewerIds: string[]
  isOrgAdminOrOwner: boolean
}

export interface ReviewSubmissionSkillReviewWrite {
  reviewSessionId: string
  reviewerId: string
  reviewerType: 'manager' | 'peer'
  skillId: string
  assignedPublicProficiencyCode: string
  proficiencyLevelId: string | null
  observedLevelId: string | null
  rubricVersionId: string | null
  confidence: 'low' | 'medium' | 'high' | null
  rationale: string | null
  observableBehaviors: string[]
  reviewStatus: 'submitted'
  submittedAt: Date
  comment: string | null
}

export interface ReviewSubmissionEvidenceLinkWrite {
  skillReviewId: string
  reviewEvidenceId: string
  relevanceType: 'direct_observation'
  reviewerNote: string | null
}

export interface ReviewSubmissionSessionStateWrite {
  reviewSessionId: string
  status: ReviewSubmissionSessionStatus
  managerReviewCompleted: boolean
  creatorReviewCompleted: boolean
  managerReviewsCount: number
  peerReviewsCount: number
  overallQualityScore: number | null
  deliveryTimeliness: string | null
  requirementAdherence: number | null
  communicationQuality: number | null
  codeQualityScore: number | null
  proactivenessScore: number | null
  wouldWorkWithAgain: boolean | null
  strengthsObserved: string | null
  areasForImprovement: string | null
  completedAt: Date | null
}

export interface ReviewSubmittedEventStage {
  submissionId: string
  reviewSessionId: string
  reviewerAssignmentId: string
  reviewerId: string
  reviewerType: 'manager' | 'peer'
  revieweeId: string
  taskId: string
  skillReviewIds: string[]
  submittedAt: string
}

export interface ReviewSubmissionPersistenceSession {
  readonly transaction: ReviewTransaction
  loadSessionForUpdate(reviewSessionId: string): Promise<ReviewSubmissionSessionSnapshot | null>
  loadActorAccess(
    reviewSessionId: string,
    actorId: string
  ): Promise<ReviewSubmissionActorAccess | null>
  markReviewerAssignmentSubmitted(input: {
    reviewSessionId: string
    reviewerId: string
    reviewerType: 'manager' | 'peer'
    submittedAt: Date
  }): Promise<{ id: string; submittedAt: string }>
  hasSubmittedReview(reviewSessionId: string, reviewerId: string): Promise<boolean>
  listOwnedEvidenceIds(reviewSessionId: string, evidenceIds: string[]): Promise<string[]>
  createSkillReviews(
    rows: ReviewSubmissionSkillReviewWrite[]
  ): Promise<SkillReviewRecord[]>
  linkEvidence(rows: ReviewSubmissionEvidenceLinkWrite[]): Promise<void>
  saveSessionState(input: ReviewSubmissionSessionStateWrite): Promise<void>
  loadTaskIdForAssignment(taskAssignmentId: string): Promise<string | null>
  writeAudit(
    execCtx: ReviewActionContext,
    input: {
      userId: string
      reviewSessionId: string
      reviewerType: 'manager' | 'peer'
      skillsReviewed: number
    }
  ): Promise<void>
  stageReviewSubmittedEvent(input: ReviewSubmittedEventStage): Promise<void>
}

/**
 * Atomic persistence boundary for one review submission.
 *
 * The command owns policy, validation, quorum/status decisions, event payload
 * construction, and post-commit effects. Infrastructure owns concrete
 * transaction mechanics and data access.
 */
export interface ReviewSubmissionUnitOfWork {
  run<T>(work: (session: ReviewSubmissionPersistenceSession) => Promise<T>): Promise<T>
}
