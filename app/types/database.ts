  actual_time: string // decimal(10,2)
  organization_id: string // v3.0: NOT NULL
  project_id: string | null
  task_visibility: 'internal' | 'external' | 'all'
  application_deadline: Date | null
  estimated_budget: string | null // decimal(15,2)
  external_applications_count: number
  sort_order: number
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

// ============================================
// BẢNG 10/23: task_versions
// ============================================

export interface TaskVersionRow {
  id: string
  task_id: string
  title: string
  description: string | null
  status: string
  label: string
  priority: string
  difficulty: string | null // v3.0: added
  assigned_to: string | null
  changed_by: string
  changed_at: Date
}

// ============================================
// BẢNG 11/23: task_applications
// ============================================

export interface TaskApplicationRow {
  id: string
  task_id: string
  applicant_id: string
  application_status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  application_source: 'public_listing' | 'invitation' | 'referral'
  message: string | null
  expected_rate: string | null // decimal(15,2)
  portfolio_links: string[] | null // JSONB
  applied_at: Date
  reviewed_by: string | null
  reviewed_at: Date | null
  rejection_reason: string | null
}

// ============================================
// BẢNG 12/23: task_assignments
// ============================================

export interface TaskAssignmentRow {
  id: string
  task_id: string
  assignee_id: string
  assigned_by: string
  assignment_type: 'member' | 'freelancer' | 'volunteer'
  assignment_status: 'active' | 'completed' | 'cancelled'
  estimated_hours: string | null // decimal(10,2)
  actual_hours: string | null // decimal(10,2)
  progress_percentage: number
  completion_notes: string | null
  verified_by: string | null
  verified_at: Date | null
  assigned_at: Date
  completed_at: Date | null
}

// ============================================
// BẢNG 13/23: task_required_skills
// ============================================

export interface TaskRequiredSkillRow {
  id: string
  task_id: string
  skill_id: string
  required_level_code: string // CHECK: proficiency level codes
  is_mandatory: boolean
  created_at: Date
}

// ============================================
// BẢNG 14/23: review_sessions
// ============================================

export interface ReviewSessionRow {
  id: string
  task_assignment_id: string
  reviewee_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'disputed'
  manager_review_completed: boolean
  peer_reviews_count: number
  required_peer_reviews: number
  completed_at: Date | null
  // v3.0: Merged from review_confirmations table
  confirmations: ReviewConfirmationEntry[] | null
  // v3.1: Auto-calculated deadline
  deadline: Date | null
  created_at: Date
  updated_at: Date
}

export interface ReviewConfirmationEntry {
  user_id: string
  action: 'confirmed' | 'disputed'
  dispute_reason?: string | null
  created_at: string
}

// ============================================
// BẢNG 18/23: skill_reviews
// ============================================

export interface SkillReviewRow {
  id: string
  review_session_id: string
  reviewer_id: string
  reviewer_type: 'manager' | 'peer'
  skill_id: string
  assigned_level_code: string // CHECK: proficiency level codes
  comment: string | null
  created_at: Date
  updated_at: Date
}

// ============================================
// BẢNG 19/23: reverse_reviews
// ============================================

export interface ReverseReviewRow {
  id: string
  review_session_id: string
  reviewer_id: string
  target_type: 'peer' | 'manager' | 'project' | 'organization'
  target_id: string
  rating: number // 1-5
  comment: string | null
  is_anonymous: boolean
  created_at: Date
}

// ============================================
// BẢNG 20/23: flagged_reviews
// ============================================

export interface FlaggedReviewRow {
  id: string
  skill_review_id: string
  // v3.0: Inline from anomaly_flags
  flag_type: string // CHECK: 'sudden_spike', 'mutual_high', etc.
  severity: 'low' | 'medium' | 'high' | 'critical'
  detected_at: Date
  status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed'
  reviewed_by: string | null
  reviewed_at: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

// ============================================
// BẢNG 21/23: user_skills
// ============================================

export interface UserSkillRow {
  id: string
  user_id: string
  skill_id: string
  level_code: string // CHECK: proficiency level codes
  total_reviews: number
  avg_score: string | null // decimal(5,2)
  last_reviewed_at: Date | null
  // Merged from user_spider_chart_data (v2.0)
  avg_percentage: string // decimal(5,2)
  last_calculated_at: Date | null
  created_at: Date
  updated_at: Date
}

// ============================================
// BẢNG 22/23: recruiter_bookmarks
// ============================================

export interface RecruiterBookmarkRow {
  id: string
  recruiter_user_id: string
  talent_user_id: string
  notes: string | null
  folder: string
  rating: number | null // 1-5
  created_at: Date
  updated_at: Date
}

// ============================================
// BẢNG 23/23: remember_me_tokens (AdonisJS managed)
// ============================================

export interface RememberMeTokenRow {
  id: number // AdonisJS managed, INT
  tokenable_id: string
  hash: string
  created_at: Date
  updated_at: Date
  expires_at: Date
}

// ============================================
// AGGREGATION & QUERY RESULTS
// ============================================

export interface CountResult {
  count: number | string
}

export interface ExistsResult {
  exists: 0 | 1
}

export interface IdResult {
  id: string
}

// Join results with permissions
export interface MembershipWithPermissions extends OrganizationUserRow {
  permissions: string[] | null
}

export interface ProjectMemberWithRole extends ProjectMemberRow {
  permissions: string[] | null
}

// Aggregate calculations
export interface AverageResult {
  avg_value: number | string
  total_count: number | string
}

export interface PercentageResult {
  avg_pct: number | string
  total_reviews: number | string
}
