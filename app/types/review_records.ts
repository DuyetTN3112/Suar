import type { ReviewConfirmationEntry, DatabaseId } from '#types/database'
import type { DateTimeLike } from '#types/user_records'

export interface ReviewSessionRecord {
  id: DatabaseId
  task_assignment_id: DatabaseId
  reviewee_id: DatabaseId
  status: 'pending' | 'in_progress' | 'completed' | 'disputed'
  manager_review_completed: boolean
  peer_reviews_count: number
  required_peer_reviews: number
  confirmations: ReviewConfirmationEntry[] | null
  overall_quality_score: number | null
  delivery_timeliness: string | null
  requirement_adherence: number | null
  communication_quality: number | null
  code_quality_score: number | null
  proactiveness_score: number | null
  would_work_with_again: boolean | null
  deadline: DateTimeLike | null
  completed_at: DateTimeLike | null
}

export interface SkillReviewRecord {
  id: DatabaseId
  review_session_id: DatabaseId
  reviewer_id: DatabaseId
  reviewer_type: 'manager' | 'peer'
  skill_id: DatabaseId
  assigned_level_code: string
  comment: string | null
}

export interface FlaggedReviewRecord {
  id: DatabaseId
  skill_review_id: DatabaseId
  flag_type: string
  severity: string
  status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed'
  reviewed_by: DatabaseId | null
  reviewed_at: DateTimeLike | null
  notes: string | null
}

export interface ReverseReviewRecord {
  id: DatabaseId
  review_session_id: DatabaseId
  reviewer_id: DatabaseId
  target_type: 'peer' | 'manager' | 'project' | 'organization'
  target_id: DatabaseId
  rating: number
  comment: string | null
  is_anonymous: boolean
}

export interface ReviewEvidenceRecord {
  id: DatabaseId
  review_session_id: DatabaseId
  evidence_type: string
  url: string | null
  title: string | null
  description: string | null
  uploaded_by: DatabaseId | null
}

export interface TaskSelfAssessmentRecord {
  id: DatabaseId
  task_assignment_id: DatabaseId
  user_id: DatabaseId
  overall_satisfaction: number | null
  difficulty_felt: string | null
  confidence_level: number | null
  what_went_well: string | null
  what_would_do_different: string | null
  blockers_encountered: string[]
  skills_felt_lacking: string[]
  skills_felt_strong: string[]
  submitted_at: DateTimeLike
}
