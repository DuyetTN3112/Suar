// ============================================================
// Review System Types — matches backend serialization format
// ============================================================

import type { ProficiencyLevelOption } from '@/apps/org/modules/profile/types.svelte'
import type { PagePagination } from '@/apps/org/shared/lib/pagination'

export type { ProficiencyLevelOption } from '@/apps/org/modules/profile/types.svelte'

export type ReviewSessionStatus = 'pending' | 'in_progress' | 'completed' | 'disputed'
export type ReviewerType = 'manager' | 'peer'
export type ReviewConfirmationAction = 'confirmed' | 'disputed'
export type ReverseReviewTargetType = 'peer' | 'manager' | 'project' | 'organization'
export type ReviewAssignmentStatus = 'pending' | 'submitted' | 'waived'

// ---- Serialized models (from .serialize()) ----

export interface SerializedUser {
  id: string
  username: string
  email: string
  avatar_url?: string | null
  bio?: string | null
  phone?: string | null
  [key: string]: unknown
}

export interface SerializedTask {
  id: string
  title: string
  project_id: string
  organization_id?: string | null
  [key: string]: unknown
}

export interface SerializedTaskAssignment {
  id: string
  task?: SerializedTask
  [key: string]: unknown
}

export interface SerializedSkill {
  id: string
  category_code: string
  display_type: string
  skill_code: string
  skill_name: string
  description?: string | null
  icon_url?: string | null
  is_active: boolean
  sort_order: number
}

export interface SerializedSkillReview {
  id: string
  review_session_id: string
  reviewer_id: string
  reviewer_type: ReviewerType
  skill_id: string
  assigned_public_proficiency_code: string
  comment?: string | null
  created_at: string
  updated_at: string
  skill?: SerializedSkill
  reviewer?: Pick<SerializedUser, 'id' | 'username' | 'email'>
}

export interface SerializedReviewAssignment {
  id: string
  review_session_id: string
  reviewer_id: string
  reviewer_type: ReviewerType
  assignment_role:
    | 'creator_required'
    | 'manager_required'
    | 'peer_required'
    | 'manager_optional'
    | 'peer_optional'
  is_required: boolean
  status: ReviewAssignmentStatus
  due_at: string | null
  submitted_at: string | null
  reviewer?: Pick<SerializedUser, 'id' | 'username' | 'email'>
}

export interface ReviewConfirmationEntry {
  user_id: string
  action: ReviewConfirmationAction
  dispute_reason?: string | null
  confirmed_at: string
}

export interface SerializedReviewSession {
  id: string
  task_assignment_id: string
  reviewee_id: string
  status: ReviewSessionStatus
  manager_review_completed: boolean
  creator_reviewer_id?: string | null
  creator_review_completed?: boolean
  manager_reviews_count?: number
  peer_reviews_count: number
  required_peer_reviews: number
  required_total_reviews?: number
  minimum_manager_reviews?: number
  minimum_peer_reviews?: number
  confirmations: ReviewConfirmationEntry[] | null
  overall_quality_score?: number | null
  delivery_timeliness?: string | null
  requirement_adherence?: number | null
  communication_quality?: number | null
  code_quality_score?: number | null
  proactiveness_score?: number | null
  would_work_with_again?: boolean | null
  strengths_observed?: string | null
  areas_for_improvement?: string | null
  deadline?: string | null
  created_at: string
  completed_at: string | null
  updated_at: string
  // Preloaded relations — may be present depending on query
  reviewee?: SerializedUser
  task_assignment?: SerializedTaskAssignment
  skill_reviews?: SerializedSkillReview[]
  reviewer_assignments?: SerializedReviewAssignment[]
}

// ---- Page props ----

/** GET /reviews/:id */
export interface ShowReviewProps {
  session: SerializedReviewSession
  skills: SerializedSkill[]
  proficiencyLevels: ProficiencyLevelOption[]
  taskComments: ReviewRelatedTaskComment[]
}

/** GET /users/:id/reviews */
export interface UserReviewsProps {
  userId: string
  reviews: SerializedReviewSession[]
  pagination: PagePagination
}

// ---- Form types ----

export interface SkillRatingInput {
  skill_id: string
  assigned_public_proficiency_code: string
  comment?: string
}

export interface SubmitReviewForm {
  reviewer_type: ReviewerType
  skill_ratings: SkillRatingInput[]
  overall_quality_score?: number | null
  delivery_timeliness?: string | null
  requirement_adherence?: number | null
  communication_quality?: number | null
  code_quality_score?: number | null
  proactiveness_score?: number | null
  would_work_with_again?: boolean | null
  strengths_observed?: string
  areas_for_improvement?: string
}

export interface ConfirmReviewForm {
  action: ReviewConfirmationAction
  disputeReason?: string
}

export interface ReviewEvidenceItem {
  id: string
  reviewSessionId: string
  evidenceType: string
  url: string | null
  title: string | null
  description: string | null
  uploadedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskSelfAssessment {
  id: string
  taskAssignmentId: string
  userId: string
  overallSatisfaction: number | null
  difficultyFelt: string | null
  confidenceLevel: number | null
  whatWentWell: string | null
  whatWouldDoDifferent: string | null
  blockersEncountered: string[]
  skillsFeltLacking: string[]
  skillsFeltStrong: string[]
  submittedAt: string
  createdAt: string
  updatedAt: string
}

export interface ReviewRelatedTaskCommentMention {
  userId: string
  username: string
  mentionToken: string
}

export interface ReviewRelatedTaskComment {
  id: string
  taskId: string
  parentCommentId: string | null
  authorId: string
  authorUsername?: string | null
  body: string
  commentType: string
  visibility: string
  reviewRelevance: boolean
  editedAt?: string | null
  createdAt: string
  updatedAt: string
  mentions?: ReviewRelatedTaskCommentMention[]
}

// ---- Status display helpers ----

export const REVIEW_STATUS_CONFIG: Record<
  ReviewSessionStatus,
  { label: string; labelVi: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pending', labelVi: 'Pending', variant: 'outline' },
  in_progress: { label: 'In Progress', labelVi: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', labelVi: 'Completed', variant: 'secondary' },
  disputed: { label: 'Disputed', labelVi: 'Disputed', variant: 'destructive' },
}

export const REVIEWER_TYPE_CONFIG: Record<ReviewerType, { label: string; labelVi: string }> = {
  manager: { label: 'Manager', labelVi: 'Manager' },
  peer: { label: 'Peer', labelVi: 'Peer' },
}

// ---- Reverse Review types ----

export const REVERSE_REVIEW_TARGET_CONFIG: Record<
  ReverseReviewTargetType,
  { label: string; labelVi: string }
> = {
  peer: { label: 'Work Environment', labelVi: 'Work Environment' },
  manager: { label: 'Manager Reviewer', labelVi: 'Manager Reviewer' },
  project: { label: 'Project', labelVi: 'Project' },
  organization: { label: 'Organization', labelVi: 'Organization' },
}

// ---- Flagged Review types ----

export type FlaggedReviewStatus = 'pending' | 'reviewed' | 'dismissed' | 'confirmed'
export type AnomalyFlagType =
  | 'sudden_spike'
  | 'mutual_high'
  | 'bulk_same_level'
  | 'frequency_anomaly'
  | 'new_account_high'
  | 'ip_collusion'
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SerializedFlaggedReview {
  id: string
  skill_review_id: string
  flag_type: AnomalyFlagType
  severity: AnomalySeverity
  detected_at: string
  status: FlaggedReviewStatus
  reviewed_by: string | null
  reviewed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  skill_review?: SerializedSkillReview
  reviewer?: Pick<SerializedUser, 'id' | 'username' | 'email'>
}

/** GET /admin/flagged-reviews */
export interface FlaggedReviewsProps {
  flaggedReviews: SerializedFlaggedReview[]
  pagination: PagePagination
  statuses: FlaggedReviewStatus[]
  currentStatus: FlaggedReviewStatus | null
}

export const FLAGGED_STATUS_CONFIG: Record<
  FlaggedReviewStatus,
  { label: string; labelVi: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pending', labelVi: 'Pending', variant: 'outline' },
  reviewed: { label: 'Reviewed', labelVi: 'Reviewed', variant: 'default' },
  dismissed: { label: 'Dismissed', labelVi: 'Dismissed', variant: 'secondary' },
  confirmed: { label: 'Confirmed', labelVi: 'Confirmed', variant: 'destructive' },
}

export const ANOMALY_TYPE_CONFIG: Record<AnomalyFlagType, { label: string; labelVi: string }> = {
  sudden_spike: { label: 'Sudden Spike', labelVi: 'Sudden Spike' },
  mutual_high: { label: 'Mutual High', labelVi: 'Mutual High' },
  bulk_same_level: { label: 'Bulk Same Level', labelVi: 'Bulk Same Level' },
  frequency_anomaly: { label: 'Frequency Anomaly', labelVi: 'Frequency Anomaly' },
  new_account_high: { label: 'New Account High', labelVi: 'New Account High' },
  ip_collusion: { label: 'IP Collusion', labelVi: 'IP Collusion' },
}

export const SEVERITY_CONFIG: Record<
  AnomalySeverity,
  { label: string; labelVi: string; color: string }
> = {
  low: { label: 'Low', labelVi: 'Low', color: 'text-sky-700 dark:text-sky-300' },
  medium: { label: 'Medium', labelVi: 'Medium', color: 'text-amber-700 dark:text-amber-300' },
  high: { label: 'High', labelVi: 'High', color: 'text-orange-700 dark:text-orange-300' },
  critical: { label: 'Critical', labelVi: 'Critical', color: 'text-destructive' },
}
