// ============================================================
// Marketplace Types — matches backend serialization format
// ============================================================

import type { PagePagination } from '@/apps/org/shared/lib/pagination'
export {
  BUSINESS_DOMAIN_OPTIONS,
  PROBLEM_CATEGORY_OPTIONS,
  ROLE_IN_TASK_OPTIONS,
  TASK_TYPE_OPTIONS,
} from '@/apps/org/modules/tasks/lib/task_taxonomy'

export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface SerializedOrganization {
  id: string
  name: string
  logo_url?: string | null
}

export interface SerializedSkill {
  id: string
  skill_name: string
  skill_code?: string | null
  category_code?: string | null
  icon_url?: string | null
  is_active?: boolean
}

export interface SerializedRequiredSkill {
  id: string
  skill_id: string
  required_public_proficiency_code?: string
  minimum_level_id?: string | null
  target_level_id?: string | null
  assessment_ceiling_level_id?: string | null
  minimumLevel?: SerializedProficiencyLevel | null
  targetLevel?: SerializedProficiencyLevel | null
  assessmentCeilingLevel?: SerializedProficiencyLevel | null
  minimum_level?: SerializedProficiencyLevel | null
  target_level?: SerializedProficiencyLevel | null
  assessment_ceiling_level?: SerializedProficiencyLevel | null
  is_mandatory?: boolean
  importance?: 'low' | 'medium' | 'high' | 'critical' | string | null
  weight?: number | null
  skill?: SerializedSkill
}

export interface SerializedProficiencyLevel {
  id: string
  code?: string | null
  display_name?: string | null
  displayName?: string | null
  short_name?: string | null
  shortName?: string | null
  ordinal?: number | null
}

export interface SerializedUserLite {
  id: string
  username?: string | null
  email?: string | null
  avatar_url?: string | null
}

export interface SerializedProject {
  id: string
  name: string
  owner?: SerializedUserLite
}

export interface SerializedTaskLite {
  id: string
  title: string
}

export interface MarketplaceTask {
  id: string
  title: string
  description?: string | null
  difficulty?: TaskDifficulty | null
  due_date?: string | null
  application_deadline?: string | null
  task_visibility: 'project' | 'internal' | 'external' | 'all'
  priority_score?: number
  recommendation_reasons?: string[]
  evidence_warnings?: string[]
  recommendation_risks?: string[]
  evidence_confidence?: 'low' | 'medium' | 'high' | null
  skill_match?: number | null
  domain_match?: number | null
  /** Deprecated listing compatibility: use priority_score for task listing priority. */
  match_score?: number
  task_type?: string | null
  acceptance_criteria?: string | null
  verification_method?: string | null
  context_background?: string | null
  role_in_task?: string | null
  business_domain?: string | null
  problem_category?: string | null
  tech_stack?: string[]
  domain_tags?: string[]
  created_at: string
  updated_at?: string
  parent_task_id?: string | null
  organization?: SerializedOrganization
  project?: SerializedProject
  creator?: SerializedUserLite
  parentTask?: SerializedTaskLite
  required_skills_rel?: SerializedRequiredSkill[]
  /** Count of current user's applications (0 = not applied, >0 = applied) */
  user_applied?: number
  can_review_applications?: boolean
  current_user_application?: {
    id: string
    status: 'pending' | 'approved' | 'rejected'
  }
  [key: string]: unknown
}

export interface MarketplaceFilters {
  skill_categories?: string[] | null
  skill_ids?: string[] | null
  keyword?: string | null
  difficulty?: string | null
  task_type?: string | null
  business_domain?: string | null
  problem_category?: string | null
  role_in_task?: string | null
  verification_method?: string | null
  tech_stack?: string | null
  domain_tags?: string | null
  accepting_applications?: 'open' | 'closed' | null
  sort_by: 'created_at' | 'due_date' | 'recommended'
  sort_order: 'asc' | 'desc'
}

/** GET /marketplace/tasks — page props from ListMarketplaceTasksController */
export interface MarketplaceTasksProps {
  tasks: MarketplaceTask[]
  pagination: PagePagination
  filters: MarketplaceFilters
  availableSkills?: SerializedSkill[]
}

// ---- Difficulty display config ----

export const DIFFICULTY_CONFIG: Record<
  TaskDifficulty,
  { label: string; marker: string }
> = {
  easy: { label: 'Easy', marker: '◇' },
  medium: { label: 'Medium', marker: '◆' },
  hard: { label: 'Hard', marker: '◆◆' },
  expert: { label: 'Expert', marker: '◆◆◆' },
}

export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Best match' },
  { value: 'created_at', label: 'Newest' },
  { value: 'due_date', label: 'Deadline' },
] as const
