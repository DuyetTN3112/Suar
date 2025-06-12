// ============================================================
// Profile & Skills Types — matches backend serialization format
// ============================================================

import type { ProficiencyLevelOption, ProficiencyLevelCode } from '../reviews/types.svelte'

// Re-export for convenience
export type { ProficiencyLevelOption, ProficiencyLevelCode }

// ---- Spider chart data ----

export interface SpiderChartPoint {
  skill_id: string
  skill_name: string
  skill_code: string
  category_code: string
  avg_percentage: number
  level_code: string | null
  total_reviews: number
}

export interface SpiderChartData {
  technical: SpiderChartPoint[]
  soft_skills: SpiderChartPoint[]
  delivery: SpiderChartPoint[]
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
  level_code: string
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
  level_code: string
  total_reviews: number
  avg_score: number | null
  avg_percentage: number | null
  last_reviewed_at: string | null
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
  completeness: number
  spiderChartData: SpiderChartData
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
  completeness: number
  spiderChartData: SpiderChartData
  isOwnProfile: boolean
}

// ---- Trust tier display ----

export type TrustTierCode = 'community' | 'organization' | 'partner'

export const TRUST_TIER_CONFIG: Record<
  TrustTierCode,
  { label: string; labelVi: string; colorHex: string; weight: number }
> = {
  community: { label: 'Community', labelVi: 'Cộng đồng', colorHex: '#6b7280', weight: 0.5 },
  organization: { label: 'Organization', labelVi: 'Tổ chức', colorHex: '#3b82f6', weight: 0.8 },
  partner: { label: 'Partner', labelVi: 'Đối tác', colorHex: '#10b981', weight: 1.0 },
}
