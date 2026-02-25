import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type {
  ReviewEvidenceRecord,
  TaskSelfAssessmentRecord,
} from '#modules/reviews/types/review_records'

export interface ReviewSessionArtifactContext {
  id: string
  taskAssignmentId: string
  revieweeId: string
  confirmationUserIds: string[]
}

export interface TaskSelfAssessmentWrite {
  overall_satisfaction: number | null
  difficulty_felt: string | null
  confidence_level: number | null
  what_went_well: string | null
  what_would_do_different: string | null
  blockers_encountered: string[]
  skills_felt_lacking: string[]
  skills_felt_strong: string[]
}

export interface ReviewEvidenceWrite {
  reviewSessionId: string
  evidenceType: string
  url: string | null
  title: string | null
  description: string | null
  uploadedBy: string
}

export interface ReviewSessionArtifactAuditWrite {
  action: string
  entityId: string
  userId: string
  newValues: Record<string, unknown>
}

export interface ReviewSessionArtifactPersistenceSession {
  loadSession(reviewSessionId: string): Promise<ReviewSessionArtifactContext | null>
  hasReviewAuthoredBy(reviewSessionId: string, actorId: string): Promise<boolean>
  findSelfAssessment(
    taskAssignmentId: string,
    userId: string
  ): Promise<TaskSelfAssessmentRecord | null>
  createSelfAssessment(
    taskAssignmentId: string,
    userId: string,
    input: TaskSelfAssessmentWrite
  ): Promise<TaskSelfAssessmentRecord>
  updateSelfAssessment(
    taskAssignmentId: string,
    userId: string,
    input: TaskSelfAssessmentWrite
  ): Promise<TaskSelfAssessmentRecord>
  createEvidence(input: ReviewEvidenceWrite): Promise<ReviewEvidenceRecord>
  writeAudit(
    execCtx: ReviewActionContext,
    input: ReviewSessionArtifactAuditWrite
  ): Promise<void>
}

/**
 * Atomic persistence boundary for review-session evidence and self-assessment
 * artifacts. Commands own authorization policy and use-case sequencing;
 * infrastructure owns the concrete transaction, repositories, and
 * transaction-bound audit writes.
 */
export interface ReviewSessionArtifactUnitOfWork {
  run<T>(work: (session: ReviewSessionArtifactPersistenceSession) => Promise<T>): Promise<T>
}
