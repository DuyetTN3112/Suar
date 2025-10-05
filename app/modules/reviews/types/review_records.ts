import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'
import type { DateTimeLike } from '#modules/users/types/user_records'

export interface ReviewSessionRecord {
  id: string
  task_assignment_id: string
  reviewee_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'disputed'
  manager_review_completed: boolean
  creator_reviewer_id: string | null
  creator_review_completed: boolean
  manager_reviews_count: number
  peer_reviews_count: number
  required_peer_reviews: number
  required_total_reviews: number
  minimum_manager_reviews: number
  minimum_peer_reviews: number
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
  reviewer_assignments?: ReviewSessionReviewerAssignmentRecord[]
}

export interface ReviewSessionReviewerAssignmentRecord {
  id: string
  review_session_id: string
  reviewer_id: string
  reviewer_type: 'manager' | 'peer'
  assignment_role:
    | 'creator_required'
    | 'manager_required'
    | 'peer_required'
    | 'manager_optional'
    | 'peer_optional'
  is_required: boolean
  status: 'pending' | 'submitted' | 'waived'
  due_at: DateTimeLike | null
  submitted_at: DateTimeLike | null
}

export interface SkillReviewRecord {
  id: string
  review_session_id: string
  reviewer_id: string
  reviewer_type: 'manager' | 'peer'
  skill_id: string
  assigned_public_proficiency_code: string
  comment: string | null
}

export interface FlaggedReviewRecord {
  id: string
  skill_review_id: string
  flag_type: string
  severity: string
  status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed'
  reviewed_by: string | null
  reviewed_at: DateTimeLike | null
  notes: string | null
}

export interface ReverseReviewRecord {
  id: string
  review_session_id: string
  reviewer_id: string
  target_type: 'peer' | 'manager' | 'project' | 'organization'
  target_id: string
  rating: number
  comment: string | null
  is_anonymous: boolean
}

export interface ReviewEvidenceRecord {
  id: string
  review_session_id: string
  evidence_type: string
  url: string | null
  title: string | null
  description: string | null
  uploaded_by: string | null
}

export interface TaskSelfAssessmentRecord {
  id: string
  task_assignment_id: string
  user_id: string
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
