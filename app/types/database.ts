/**
 * Database Row Types - Match exactly with suar.sql schema
 * Generated from database structure for type safety
 *
 * ID Migration Note:
 * All `id` fields use `DatabaseId` (number | string) to support both:
 * - Current: INT AUTO_INCREMENT (MySQL)
 * - Future:  UUIDv7 (PostgreSQL)
 *
 * FK fields follow the same pattern for consistency.
 */

/**
 * Universal ID type — compatible with both INT (MySQL) and UUIDv7 (PostgreSQL).
 * Use this for all primary keys and foreign keys during the migration period.
 */
export type DatabaseId = number | string

// ============================================
// USER & AUTHENTICATION
// ============================================

export interface UserRow {
  id: DatabaseId
  username: string
  email: string
  status_id: DatabaseId
  system_role_id: DatabaseId | null
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
  current_organization_id: DatabaseId | null
  auth_method: 'email' | 'google' | 'github'
}

export interface UserStatusRow {
  id: DatabaseId
  name: string
  description: string | null
  created_at: Date
  updated_at: Date
}

export interface SystemRoleRow {
  id: DatabaseId
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
  id: DatabaseId
  name: string
  slug: string
  description: string | null
  logo: string | null
  website: string | null
  plan: string | null
  owner_id: DatabaseId
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface OrganizationUserRow {
  organization_id: DatabaseId
  user_id: DatabaseId
  created_at: Date
  updated_at: Date
  role_id: DatabaseId
  status: 'pending' | 'approved' | 'rejected'
  invited_by: DatabaseId | null
}

export interface OrganizationRoleRow {
  id: DatabaseId
  organization_id: DatabaseId | null
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
  id: DatabaseId
  creator_id: DatabaseId
  name: string
  description: string | null
  organization_id: DatabaseId
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  start_date: Date | null
  end_date: Date | null
  status_id: DatabaseId | null
  budget: string // decimal(15,2)
  manager_id: DatabaseId | null
  owner_id: DatabaseId | null
  visibility: 'public' | 'private' | 'team'
  allow_freelancer: boolean
  approval_required_for_members: boolean
}

export interface ProjectMemberRow {
  project_id: DatabaseId
  user_id: DatabaseId
  project_role_id: DatabaseId
  created_at: Date
}

export interface ProjectRoleRow {
  id: DatabaseId
  project_id: DatabaseId | null
  name: string
  description: string | null
  permissions: string[] | null // JSON array
  is_custom: boolean
  created_at: Date
  updated_at: Date
}

export interface ProjectStatusRow {
  id: DatabaseId
  name: string
  description: string | null
  created_at: Date
  updated_at: Date
}

// ============================================
// CONVERSATIONS & MESSAGES
// ============================================

export interface ConversationRow {
  id: DatabaseId
  title: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  last_message_id: DatabaseId | null
  organization_id: DatabaseId | null
  last_message_at: Date | null
}

export interface ConversationParticipantRow {
  id: DatabaseId
  conversation_id: DatabaseId
  user_id: DatabaseId
}

export interface MessageRow {
  id: DatabaseId
  conversation_id: DatabaseId
  sender_id: DatabaseId
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
  id: DatabaseId
  user_id: DatabaseId
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
  id: DatabaseId
  user_id: DatabaseId | null
  action: string
  entity_type: string
  entity_id: DatabaseId | null
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
  id: DatabaseId
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
  id: DatabaseId
  category_id: DatabaseId
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
  id: DatabaseId
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
  id: DatabaseId
  user_id: DatabaseId
  skill_id: DatabaseId
  proficiency_level_id: DatabaseId
  total_reviews: number
  avg_score: string | null // decimal(5,2)
  created_at: Date
  updated_at: Date
}

// ============================================
// REVIEW SYSTEM
// ============================================

export interface ReviewSessionRow {
  id: DatabaseId
  task_assignment_id: DatabaseId
  reviewee_id: DatabaseId
  status: 'pending' | 'in_progress' | 'completed' | 'disputed'
  manager_review_completed: boolean
  peer_reviews_count: number
  required_peer_reviews: number
  created_at: Date
  completed_at: Date | null
  updated_at: Date
}

export interface SkillReviewRow {
  id: DatabaseId
  review_session_id: DatabaseId
  skill_id: DatabaseId
  reviewer_id: DatabaseId
  reviewer_type: 'manager' | 'peer'
  proficiency_level_id: DatabaseId
  confidence_score: number // 1-5
  comment: string | null
  created_at: Date
}

export interface ReviewConfirmationRow {
  id: DatabaseId
  review_session_id: DatabaseId
  user_id: DatabaseId
  action: 'confirmed' | 'disputed'
  dispute_reason: string | null
  created_at: Date
}

export interface ReverseReviewRow {
  id: DatabaseId
  review_session_id: DatabaseId
  reviewer_id: DatabaseId
  target_type: 'peer' | 'manager' | 'project' | 'organization'
  target_id: DatabaseId
  rating: number // 1-5
  comment: string | null
  is_anonymous: boolean
  created_at: Date
}

export interface ReviewerCredibilityRow {
  id: DatabaseId
  user_id: DatabaseId
  credibility_score: string // decimal(5,2)
  total_reviews_given: number
  accurate_reviews: number
  disputed_reviews: number
  last_calculated_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface FlaggedReviewRow {
  id: DatabaseId
  skill_review_id: DatabaseId
  anomaly_flag_id: DatabaseId
  detected_at: Date
  status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed'
  reviewed_by: DatabaseId | null
  reviewed_at: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

export interface AnomalyFlagRow {
  id: DatabaseId
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
  id: DatabaseId
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
