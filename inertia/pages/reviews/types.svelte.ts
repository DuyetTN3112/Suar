// ============================================================
// Review System Types — matches backend serialization format
// ============================================================

export type ReviewSessionStatus = 'pending' | 'in_progress' | 'completed' | 'disputed'
export type ReviewerType = 'manager' | 'peer'
export type ReviewConfirmationAction = 'confirmed' | 'disputed'
export type ReverseReviewTargetType = 'peer' | 'manager' | 'project' | 'organization'

export type ProficiencyLevelCode =
  | 'beginner'
  | 'elementary'
  | 'junior'
  | 'middle'
  | 'senior'
  | 'lead'
  | 'principal'
  | 'master'

export interface ProficiencyLevelOption {
  label: string
  labelVi: string
  value: ProficiencyLevelCode
  description: string
  minPercentage: number
  maxPercentage: number
  colorHex: string
  order: number
}

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
  assigned_level_code: string
  comment?: string | null
  created_at: string
  updated_at: string
  skill?: SerializedSkill
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
  peer_reviews_count: number
  required_peer_reviews: number
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
  created_at: string
  completed_at: string | null
  updated_at: string
  // Preloaded relations — may be present depending on query
  reviewee?: SerializedUser
  task_assignment?: SerializedTaskAssignment
  skill_reviews?: SerializedSkillReview[]
}

// ---- Page props ----

export interface PaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

/** GET /reviews/pending */
export interface PendingReviewsProps {
  reviews: SerializedReviewSession[]
  meta: PaginationMeta
}

/** GET /reviews/:id */
export interface ShowReviewProps {
  session: SerializedReviewSession
  skills: SerializedSkill[]
  proficiencyLevels: ProficiencyLevelOption[]
}

/** GET /my-reviews */
export interface MyReviewsProps {
  reviews: SerializedReviewSession[]
  meta: PaginationMeta
}

/** GET /users/:id/reviews */
export interface UserReviewsProps {
  userId: string
  reviews: SerializedReviewSession[]
  meta: PaginationMeta
}

// ---- Form types ----

export interface SkillRatingInput {
  skill_id: string
  level_code: string
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
  dispute_reason?: string
}

export interface ReviewEvidenceItem {
  id: string
  review_session_id: string
  evidence_type: string
  url: string | null
  title: string | null
  description: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface TaskSelfAssessment {
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
  submitted_at: string
  created_at: string
  updated_at: string
}

// ---- Status display helpers ----

export const REVIEW_STATUS_CONFIG: Record<
  ReviewSessionStatus,
  { label: string; labelVi: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pending', labelVi: 'Chờ đánh giá', variant: 'outline' },
  in_progress: { label: 'In Progress', labelVi: 'Đang đánh giá', variant: 'default' },
  completed: { label: 'Completed', labelVi: 'Hoàn thành', variant: 'secondary' },
  disputed: { label: 'Disputed', labelVi: 'Tranh chấp', variant: 'destructive' },
}

export const REVIEWER_TYPE_CONFIG: Record<ReviewerType, { label: string; labelVi: string }> = {
  manager: { label: 'Manager', labelVi: 'Quản lý' },
  peer: { label: 'Peer', labelVi: 'Đồng nghiệp' },
}

// ---- Reverse Review types ----

export interface ReverseReviewForm {
  target_type: ReverseReviewTargetType
  target_id: string
  rating: number
  comment?: string
  is_anonymous: boolean
}

export const REVERSE_REVIEW_TARGET_CONFIG: Record<
  ReverseReviewTargetType,
  { label: string; labelVi: string }
> = {
  peer: { label: 'Peer Reviewer', labelVi: 'Người đánh giá đồng nghiệp' },
  manager: { label: 'Manager Reviewer', labelVi: 'Người đánh giá quản lý' },
  project: { label: 'Project', labelVi: 'Dự án' },
  organization: { label: 'Organization', labelVi: 'Tổ chức' },
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
  meta: PaginationMeta
  statuses: FlaggedReviewStatus[]
  currentStatus: FlaggedReviewStatus | null
}

export const FLAGGED_STATUS_CONFIG: Record<
  FlaggedReviewStatus,
  { label: string; labelVi: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pending', labelVi: 'Chờ xử lý', variant: 'outline' },
  reviewed: { label: 'Reviewed', labelVi: 'Đã xem', variant: 'default' },
  dismissed: { label: 'Dismissed', labelVi: 'Đã bỏ qua', variant: 'secondary' },
  confirmed: { label: 'Confirmed', labelVi: 'Xác nhận bất thường', variant: 'destructive' },
}

export const ANOMALY_TYPE_CONFIG: Record<AnomalyFlagType, { label: string; labelVi: string }> = {
  sudden_spike: { label: 'Sudden Spike', labelVi: 'Tăng đột biến' },
  mutual_high: { label: 'Mutual High', labelVi: 'Đánh giá cao lẫn nhau' },
  bulk_same_level: { label: 'Bulk Same Level', labelVi: 'Cùng mức đánh giá hàng loạt' },
  frequency_anomaly: { label: 'Frequency Anomaly', labelVi: 'Tần suất bất thường' },
  new_account_high: { label: 'New Account High', labelVi: 'Tài khoản mới điểm cao' },
  ip_collusion: { label: 'IP Collusion', labelVi: 'Cấu kết IP' },
}

export const SEVERITY_CONFIG: Record<
  AnomalySeverity,
  { label: string; labelVi: string; color: string }
> = {
  low: { label: 'Low', labelVi: 'Thấp', color: 'text-blue-600' },
  medium: { label: 'Medium', labelVi: 'Trung bình', color: 'text-yellow-600' },
  high: { label: 'High', labelVi: 'Cao', color: 'text-orange-600' },
  critical: { label: 'Critical', labelVi: 'Nghiêm trọng', color: 'text-red-600' },
}
