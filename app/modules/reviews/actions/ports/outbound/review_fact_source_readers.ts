import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'

export interface ProfileReviewSessionSource {
  id: string
  task_assignment_id: string
  reviewee_id: string
  status: string
  confirmations: unknown
  overall_quality_score: number | string | null
  updated_at: Date | string
}

export interface ProfileReviewDisputeSource {
  id: string
  review_session_id: string
  status: string
  final_decision: string | null
  updated_at: Date | string
}

export interface ProfileReviewSkillRatingSource {
  id: string
  review_session_id: string
  skill_id: string
  assigned_public_proficiency_code: string
  reviewer_type: string
  review_status: string
  is_fraud: boolean
  superseded_by: string | null
  updated_at: Date | string
}

export interface ProfileReviewEvidenceSource {
  id: string
  review_session_id: string
  evidence_type: string
  url: string | null
  title: string | null
  verification_status: string | null
  is_sensitive: boolean | null
  updated_at: Date | string
}

export interface ProfileReviewSourceSnapshot {
  sessions: ProfileReviewSessionSource[]
  disputes: ProfileReviewDisputeSource[]
  ratings: ProfileReviewSkillRatingSource[]
  evidences: ProfileReviewEvidenceSource[]
}

export interface ProfileReviewFactSourceReader {
  load(
    revieweeUserId: string,
    taskAssignmentIds: string[],
    transaction?: ReviewTransaction
  ): Promise<ProfileReviewSourceSnapshot>
}

export interface SelfAssessmentAccuracySource {
  task_assignment_id: string
  review_session_id: string
  reviewee_id: string
  session_status: string
  confirmations: unknown
  self_score: number | string | null
  reviewed_score: number | string | null
  review_completed_at: Date | string | null
}

export interface SelfAssessmentAccuracyDisputeSource {
  id: string
  review_session_id: string
  status: string
  final_decision: string | null
  updated_at: Date | string
}

export interface SelfAssessmentAccuracySourceSnapshot {
  sources: SelfAssessmentAccuracySource[]
  disputes: SelfAssessmentAccuracyDisputeSource[]
}

export interface SelfAssessmentAccuracyFactSourceReader {
  load(
    userId: string,
    transaction?: ReviewTransaction
  ): Promise<SelfAssessmentAccuracySourceSnapshot>
}

export interface TalentExplainabilitySessionSource {
  id: string
  reviewee_id: string
  status: string
  confirmations: unknown
  updated_at: Date | string
}

export interface TalentExplainabilityDisputeSource {
  id: string
  review_session_id: string
  status: string
  final_decision: string | null
  updated_at: Date | string
}

export interface TalentExplainabilityRatingSource {
  id: string
  review_session_id: string
  skill_id: string
  confidence: string | null
  review_status: string
  is_fraud: boolean
  superseded_by: string | null
  submitted_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

export interface TalentExplainabilitySourceSnapshot {
  sessions: TalentExplainabilitySessionSource[]
  disputes: TalentExplainabilityDisputeSource[]
  ratings: TalentExplainabilityRatingSource[]
  revision: string
}

export interface TalentExplainabilityFactSourceReader {
  load(
    revieweeUserIds: string[],
    transaction?: ReviewTransaction
  ): Promise<TalentExplainabilitySourceSnapshot>
}
