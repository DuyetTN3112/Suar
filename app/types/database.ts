/**
 * Database Row Types - Match exactly with suar.sql schema
 * Generated from database structure for type safety
 */

// ============================================
// USER & AUTHENTICATION
// ============================================

export interface UserRow {
  id: number
  username: string
  email: string
  status_id: number
  system_role_id: number | null
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
  current_organization_id: number | null
  auth_method: 'email' | 'google' | 'github'
}

export interface UserStatusRow {
  id: number
  name: string
  description: string | null
  created_at: Date
  updated_at: Date
}

export interface SystemRoleRow {
  id: number
  name: string
  description: string | null
  permissions: string[] | null // JSON array
  created_at: Date
  updated_at: Date
}

// ============================================
// ORGANIZATIONS
// ============================================

export interface OrganizationRow {
  id: number
  name: string
  slug: string
  description: string | null
  logo: string | null
  website: string | null
  plan: string | null
  owner_id: number
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface OrganizationUserRow {
  organization_id: number
  user_id: number
  created_at: Date
  updated_at: Date
  role_id: number
  status: 'pending' | 'approved' | 'rejected'
  invited_by: number | null
}

export interface OrganizationRoleRow {
  id: number
  organization_id: number | null
  name: string
  description: string | null
  permissions: string[] | null // JSON array
  is_custom: boolean
  created_at: Date
  updated_at: Date
}

// ============================================
// PROJECTS
// ============================================

export interface ProjectRow {
  id: number
  creator_id: number
  name: string
  description: string | null
  organization_id: number
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  start_date: Date | null
  end_date: Date | null
  status_id: number | null
  budget: string // decimal(15,2)
  manager_id: number | null
  owner_id: number | null
  visibility: 'public' | 'private' | 'team'
  allow_freelancer: boolean
  approval_required_for_members: boolean
}

export interface ProjectMemberRow {
  project_id: number
  user_id: number
  project_role_id: number
  created_at: Date
}

export interface ProjectRoleRow {
  id: number
  project_id: number | null
  name: string
  description: string | null
  permissions: string[] | null // JSON array
  is_custom: boolean
  created_at: Date
  updated_at: Date
}

export interface ProjectStatusRow {
  id: number
  name: string
  description: string | null
  created_at: Date
  updated_at: Date
}

// ============================================
// CONVERSATIONS & MESSAGES
// ============================================

export interface ConversationRow {
  id: number
  title: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  last_message_id: number | null
  organization_id: number | null
  last_message_at: Date | null
}

export interface ConversationParticipantRow {
  id: number
  conversation_id: number
  user_id: number
}

export interface MessageRow {
  id: number
  conversation_id: number
  sender_id: number
  message: string
  send_status: 'sending' | 'sent' | 'failed'
  is_recalled: boolean
  recalled_at: Date | null
  recall_scope: 'self' | 'all' | null
  created_at: Date
  updated_at: Date
  read_at: Date | null
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface NotificationRow {
  id: number
  user_id: number
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  created_at: Date
}

// ============================================
// AUDIT LOGS
// ============================================

export interface AuditLogRow {
  id: number
  user_id: number | null
  action: string
  entity_type: string
  entity_id: number | null
  old_values: Record<string, unknown> | null // JSON
  new_values: Record<string, unknown> | null // JSON
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

// ============================================
// SKILLS & PROFICIENCY
// ============================================

export interface SkillCategoryRow {
  id: number
  category_code: string
  category_name: string
  display_type: 'list' | 'spider_chart'
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface SkillRow {
  id: number
  category_id: number
  skill_code: string
  skill_name: string
  description: string | null
  icon_url: string | null
  is_active: boolean
  sort_order: number
  created_at: Date
  updated_at: Date
}

export interface ProficiencyLevelRow {
  id: number
  level_order: number
  level_code: string
  level_name_en: string
  level_name_vi: string
  min_percentage: string // decimal(5,2)
  max_percentage: string // decimal(5,2)
  description: string | null
  color_hex: string | null
  created_at: Date
  updated_at: Date
}

export interface UserSkillRow {
  id: number
  user_id: number
  skill_id: number
  proficiency_level_id: number
  total_reviews: number
  avg_score: string | null // decimal(5,2)
  created_at: Date
  updated_at: Date
}

// ============================================
// REVIEW SYSTEM
// ============================================

export interface ReviewSessionRow {
  id: number
  task_assignment_id: number
  reviewee_id: number
  status: 'pending' | 'in_progress' | 'completed' | 'disputed'
  manager_review_completed: boolean
  peer_reviews_count: number
  required_peer_reviews: number
  created_at: Date
  completed_at: Date | null
  updated_at: Date
}

export interface SkillReviewRow {
  id: number
  review_session_id: number
  skill_id: number
  reviewer_id: number
  reviewer_type: 'manager' | 'peer'
  proficiency_level_id: number
  confidence_score: number // 1-5
  comment: string | null
  created_at: Date
}

export interface ReviewConfirmationRow {
  id: number
  review_session_id: number
  user_id: number
  action: 'confirmed' | 'disputed'
  dispute_reason: string | null
  created_at: Date
}

export interface ReverseReviewRow {
  id: number
  review_session_id: number
  reviewer_id: number
  target_type: 'peer' | 'manager' | 'project' | 'organization'
  target_id: number
  rating: number // 1-5
  comment: string | null
  is_anonymous: boolean
  created_at: Date
}

export interface ReviewerCredibilityRow {
  id: number
  user_id: number
  credibility_score: string // decimal(5,2)
  total_reviews_given: number
  accurate_reviews: number
  disputed_reviews: number
  last_calculated_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface FlaggedReviewRow {
  id: number
  skill_review_id: number
  anomaly_flag_id: number
  detected_at: Date
  status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed'
  reviewed_by: number | null
  reviewed_at: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

export interface AnomalyFlagRow {
  id: number
  flag_type: string
  flag_name: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string | null
  auto_action: string | null
  created_at: Date
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
  id: number
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
