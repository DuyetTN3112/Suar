import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'

export interface ReviewSessionSkillIdentityProjection {
  id: string
  skill_name: string
  category_code: string
  is_active: boolean
}

export interface ReviewSessionReviewerIdentityProjection {
  id: string
  username: string
  email: string | null
}

export interface ReviewTaskSummaryProjection {
  id: string
  title: string
}

export interface ReviewTaskDetailProjection extends ReviewTaskSummaryProjection {
  description: string
  status: string
  priority: string
  difficulty: string | null
  due_date: string | null
}

export interface ReviewTaskAssignmentSummaryProjection {
  id: string
  task_id: string
  task: ReviewTaskSummaryProjection
}

export interface ReviewTaskAssignmentDetailProjection
  extends Omit<ReviewTaskAssignmentSummaryProjection, 'task'> {
  assignee_id: string
  assignment_status: string
  estimated_hours: number | null
  actual_hours: number | null
  completion_notes: string | null
  task: ReviewTaskDetailProjection
}

export interface MissingReviewTaskAssignmentProjection {
  id: string
  task_id: null
  task: null
  unavailable: true
}

export type ReviewTaskAssignmentProjection =
  | ReviewTaskAssignmentSummaryProjection
  | ReviewTaskAssignmentDetailProjection
  | MissingReviewTaskAssignmentProjection

export interface ReviewSessionSkillReviewProjection {
  id: string
  review_session_id: string
  reviewer_id: string
  reviewer_type: 'manager' | 'peer'
  skill_id: string
  assigned_public_proficiency_code: string
  proficiency_level_id: string | null
  observed_level_id: string | null
  rubric_version_id: string | null
  confidence: 'low' | 'medium' | 'high' | null
  rationale: string | null
  observable_behaviors: string[]
  review_status: 'draft' | 'submitted' | 'superseded' | 'invalidated'
  comment: string | null
  submitted_at: string | null
  superseded_by: string | null
  is_fraud: boolean
  created_at: string | null
  updated_at: string | null
  skill: ReviewSessionSkillIdentityProjection
  reviewer?: ReviewSessionReviewerIdentityProjection
}

export interface ReviewSessionProjection {
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
  strengths_observed: string | null
  areas_for_improvement: string | null
  deadline: string | null
  created_at: string | null
  completed_at: string | null
  updated_at: string | null
  reviewee?: Record<string, unknown>
  task_assignment: ReviewTaskAssignmentProjection
  reviewer_assignments?: Record<string, unknown>[]
  skill_reviews: ReviewSessionSkillReviewProjection[]
}
