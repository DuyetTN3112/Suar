// ============================================================
// Profile & Skills Types — matches backend serialization format
// ============================================================

export type ProficiencyLevelCode =
  | 'l0'
  | 'l1'
  | 'l2'
  | 'l3'
  | 'l4'
  | 'l5'
  | 'l6'
  | 'l7'
  | 'l8'
  | 'l9'
  | 'l10'
  | 'l11'
  | 'l12'
  | 'l13'
  | 'l14'

export interface ProficiencyLevelOption {
  label: string
  labelVi: string
  value: ProficiencyLevelCode
  description: string
  minPercentage: number
  maxPercentage: number
  colorHex: string
  order: number
  code?: string
  careerBand?: string
  legacyBandCode?: string
}

// ---- Spider chart data ----

export interface SpiderChartPoint {
  skill_id: string
  skill_name: string
  skill_code: string
  category_code: string
  avg_percentage: number
  verified_public_proficiency_code: string | null
  total_reviews: number
  source?: 'imported' | 'reviewed' | null
  governance_state?: 'unreviewed' | 'verified' | 'under_dispute' | null
}

export interface SpiderChartData {
  technology: SpiderChartPoint[]
  engineering: SpiderChartPoint[]
  soft_skills: SpiderChartPoint[]
  delivery: SpiderChartPoint[]
}

export interface ProfileChartCardSummary {
  chart_mode: 'radar' | 'list_fallback' | 'insufficient_data'
  verified_average_score: number | null
  confidence_summary: string | null
  warnings: string[]
  strongest_verified_skill_name: string | null
  most_evidenced_skill_name: string | null
  most_evidenced_review_count: number
  needs_verification_names: string[]
}

export interface ProfileSnapshotSummary {
  id: string
  user_id: string
  version: number
  snapshot_name: string | null
  is_current: boolean
  is_public: boolean
  shareable_slug: string | null
  shareable_token: string | null
  summary: Record<string, unknown> | null
  skills_verified: unknown[] | null
  work_highlights: unknown[] | null
  performance_metrics: Record<string, unknown> | null
  trust_metrics: Record<string, unknown> | null
  scoring_version: string
  created_at: string
  updated_at: string
}

// ---- Serialized user profile ----

export interface SerializedUserProfile {
  id: string
  username: string
  email: string
  avatar_url?: string | null
  bio?: string | null
  phone?: string | null
  address?: string | null
  timezone?: string | null
  status_name?: string
  auth_method?: string
  trust_score?: number | null
  trust_tier_code?: string | null
  credibility_score?: number | null
  reverse_review_summary?: {
    total_reviews: number
    average_rating: number | null
    peer_reviews: number
    manager_reviews: number
    anonymous_reviews: number
    last_review_at: string | null
  } | null
  created_at: string
  updated_at: string
  current_organization?: {
    id: string
    name: string
    slug?: string
  } | null
  skills?: SerializedUserSkillRelation[]
  [key: string]: unknown
}

export interface SerializedUserSkillRelation {
  id: string
  skill_id: string
  verified_public_proficiency_code: string
  total_reviews: number
  avg_score: number | null
  avg_percentage: number | null
  last_reviewed_at: string | null
  skill?: {
    id: string
    skill_name: string
    skill_code: string
    category_code: string
    display_type: string
  }
}

// ---- Skills ----

export interface AvailableSkill {
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

export interface UserSkillResult {
  id: string
  skill_id: string
  skill_name: string
  skill_code: string
  category_name: string
  category_code: string
  verified_public_proficiency_code: string
  source: 'imported' | 'reviewed'
  total_reviews: number
  avg_score: number | null
  avg_percentage: number | null
  confidence_signal: 'low' | 'medium' | 'high' | null
  freshness_state: 'unreviewed' | 'fresh' | 'stale'
  governance_state: 'unreviewed' | 'verified' | 'under_dispute'
  last_reviewed_at: string | null
  evidence_count: number
  evidence_history: SkillEvidenceHistoryEntry[]
}

export interface SkillEvidenceLink {
  evidence_id: string
  evidence_type: string
  url: string
  title: string | null
}

export interface SkillEvidenceHistoryEntry {
  task_id: string
  task_title: string
  completed_at: string | null
  assigned_public_proficiency_code: string | null
  reviewer_type: string | null
  comment: string | null
  evidence_links: SkillEvidenceLink[]
}

export interface ProfileWorkHistory {
  organizations: {
    org_name: string
    org_role: string
    joined_at: string
    status: string
  }[]
  projects: {
    project_name: string
    org_name: string | null
    project_role: string
    start_date: string | null
    end_date: string | null
    visibility: string
  }[]
}

export interface SkillCategoryOption {
  label: string
  labelVi: string
  value: string
  displayType: string
}

// ---- Page props ----

/** GET /profile */
export interface ProfileShowProps {
  user: SerializedUserProfile
  userSkills: UserSkillResult[]
  completeness: number
  spiderChartData: SpiderChartData
  workHistory: ProfileWorkHistory
  currentSnapshot?: ProfileSnapshotSummary | null
}

/** GET /profile/edit */
export interface ProfileEditProps {
  user: SerializedUserProfile
  completeness: number
  availableSkills: AvailableSkill[]
  categories: SkillCategoryOption[]
  proficiencyLevels: ProficiencyLevelOption[]
  userSkills: UserSkillResult[]
}

/** GET /users/:id/profile */
export interface ProfileViewProps {
  user: SerializedUserProfile
  userSkills: UserSkillResult[]
  completeness: number
  spiderChartData: SpiderChartData
  workHistory: ProfileWorkHistory
  isOwnProfile: boolean
}

// ---- Trust tier display ----

export type TrustTierCode = 'community' | 'organization' | 'partner'

export const TRUST_TIER_CONFIG: Record<
  TrustTierCode,
  { label: string; labelVi: string; colorHex: string; weight: number }
> = {
  community: { label: 'Community', labelVi: 'Community', colorHex: '#6b7280', weight: 0.5 },
  organization: { label: 'Organization', labelVi: 'Organization', colorHex: '#3b82f6', weight: 0.8 },
  partner: { label: 'Partner', labelVi: 'Partner', colorHex: '#10b981', weight: 1.0 },
}
