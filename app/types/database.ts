/**
 * Database Row Types — Match exactly with suar_postgresql_v3.sql schema
 * Generated from database structure for type safety
 *
 * v3.0: All IDs are UUIDv7 (string). No more `number | string` union.
 *       Removed 10 lookup tables — roles/levels/categories all inline as VARCHAR.
 *       23 tables total.
 */

/**
 * Universal ID type — v3.0: All IDs are UUIDv7 strings.
 * Kept as type alias for backward compatibility with existing code.
 */
export type DatabaseId = string

// ============================================
// BẢNG 1/23: skills
// ============================================

export interface SkillRow {
  id: string
  category_code: string // CHECK: 'technical', 'soft_skill', 'delivery'
  display_type: 'spider_chart' | 'list'
  skill_code: string
  skill_name: string
  description: string | null
  icon_url: string | null
  is_active: boolean
  sort_order: number
  created_at: Date
  updated_at: Date
}

// ============================================
// BẢNG 2/23: users
// ============================================

export interface UserRow {
  id: string
  username: string
  email: string | null
  status: 'active' | 'inactive' | 'suspended'
  system_role: 'superadmin' | 'system_admin' | 'registered_user'
  current_organization_id: string | null
  auth_method: 'google' | 'github'
  // Merged from user_details (v2.0)
  avatar_url: string | null
  bio: string | null
  phone: string | null
  address: string | null
  timezone: string
  language: string
  is_freelancer: boolean
  freelancer_rating: string | null // decimal(3,2)
  freelancer_completed_tasks_count: number
  // Merged from public_profile_settings (v2.0 JSONB)
  profile_settings: UserProfileSettings | null
  // v3.0: trust_data — current_tier_code string (not UUID)
  trust_data: UserTrustData | null
  // Merged from reviewer_credibility (v2.0 JSONB)
  credibility_data: UserCredibilityData | null
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface UserProfileSettings {
  /** @deprecated Freelancer profiles should always be searchable */
  is_searchable: boolean
  /** @deprecated Freelancer contact info should always be visible */
  show_contact_info: boolean
  /** @deprecated Freelancer organizations should always be visible */
  show_organizations: boolean
  /** @deprecated Freelancer projects should always be visible */
  show_projects: boolean
  /** @deprecated Spider chart should always be visible */
  show_spider_chart: boolean
  /** @deprecated Technical skills should always be visible */
  show_technical_skills: boolean
  custom_headline: string | null
  preferred_job_types: string[]
  preferred_locations: string[]
  min_salary_expectation: number | null
  salary_currency: string
  available_from: string | null
}

export interface UserTrustData {
  current_tier_code: string | null // 'community' | 'organization' | 'partner'
  calculated_score: number
  raw_score: number
  total_verified_reviews: number
  last_calculated_at: string | null
  scoring_version?: string
  performance_score?: number
  performance_breakdown?: {
    quality_score: number
    delivery_score: number
    difficulty_bonus: number
    consistency_score: number
    calculated_at: string | null
  }
}

export interface UserCredibilityData {
  credibility_score: number
  total_reviews_given: number
  accurate_reviews: number
  disputed_reviews: number
  last_calculated_at: string | null
}

// ============================================
// BẢNG 3/23: user_oauth_providers
// ============================================

export interface UserOAuthProviderRow {
  id: string
  user_id: string
  provider: string
  provider_id: string
  email: string | null
  access_token: string | null
  refresh_token: string | null
  created_at: Date
  updated_at: Date
}

// ============================================
// BẢNG 4/23: organizations
// ============================================

export interface OrganizationRow {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  website: string | null
  plan: 'free' | 'starter' | 'professional' | 'enterprise' | null
  owner_id: string
  // v3.0: Custom roles JSONB
  custom_roles: CustomRoleDefinition[] | null
  // v3.0: Merged from verified_partners
  partner_type: 'gold' | 'silver' | 'bronze' | null
  partner_verified_at: Date | null
  partner_verified_by: string | null
  partner_verification_proof: string | null
  partner_expires_at: Date | null
  partner_is_active: boolean
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface CustomRoleDefinition {
  name: string
  permissions: string[]
  description?: string
}

// ============================================
// BẢNG 5/23: organization_users
// ============================================

export interface OrganizationUserRow {
  organization_id: string
  user_id: string
  org_role: string // CHECK: 'org_owner', 'org_admin', 'org_member' (or custom role name)
  status: 'pending' | 'approved' | 'rejected'
  invited_by: string | null
  created_at: Date
  updated_at: Date
}

// ============================================
// BẢNG 6/23: projects
// ============================================

export interface ProjectRow {
  id: string
  creator_id: string
  name: string
  description: string | null
  organization_id: string
  start_date: Date | null
  end_date: Date | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  budget: string // decimal(15,2)
  manager_id: string | null
  owner_id: string | null
  visibility: 'public' | 'private' | 'team'
  allow_freelancer: boolean
  approval_required_for_members: boolean
  tags: unknown[] | null // JSONB
  custom_roles: CustomRoleDefinition[] | null // v3.0
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

// ============================================
// BẢNG 7/23: project_members
// ============================================

export interface ProjectMemberRow {
  project_id: string
  user_id: string
  project_role: string // CHECK: 'project_owner', 'project_manager', 'project_member', 'project_viewer'
  created_at: Date
}

// ============================================
// BẢNG 8/23: project_attachments
// ============================================

export interface ProjectAttachmentRow {
  id: string
  project_id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: string | null
  created_at: Date
  updated_at: Date
}

// ============================================
// BẢNG 9/23: tasks
// ============================================

export interface TaskRow {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done' | 'cancelled' | 'in_review'
  label: 'bug' | 'feature' | 'enhancement' | 'documentation'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | null
  assigned_to: string | null
  creator_id: string
  updated_by: string | null
  due_date: Date
  parent_task_id: string | null
  estimated_time: string // decimal(10,2)
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
