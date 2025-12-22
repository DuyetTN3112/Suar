// ============================================================
// Marketplace Types — matches backend serialization format
// ============================================================

export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface SerializedOrganization {
  id: string
  name: string
  logo_url?: string | null
}

export interface SerializedSkill {
  id: string
  skill_name: string
  skill_code: string
  category_code: string
  icon_url?: string | null
}

export interface SerializedRequiredSkill {
  id: string
  skill_id: string
  required_level_code?: string
  is_mandatory?: boolean
  skill?: SerializedSkill
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
  estimated_budget?: number | null
  task_visibility: 'internal' | 'external' | 'all'
  match_score?: number
  acceptance_criteria?: string | null
  verification_method?: string | null
  context_background?: string | null
  role_in_task?: string | null
  business_domain?: string | null
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
  current_user_application?: {
    id: string
    status: 'pending' | 'approved' | 'rejected'
  }
  [key: string]: unknown
}

export interface PaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface MarketplaceFilters {
  skill_ids?: string[] | null
  keyword?: string | null
  difficulty?: string | null
  min_budget?: number | null
  max_budget?: number | null
  sort_by: 'created_at' | 'due_date'
  sort_order: 'asc' | 'desc'
}

/** GET /marketplace/tasks — page props from ListPublicTasksController */
export interface MarketplaceTasksProps {
  tasks: MarketplaceTask[]
  meta: PaginationMeta
  filters: MarketplaceFilters
}

// ---- Difficulty display config ----

export const DIFFICULTY_CONFIG: Record<
  TaskDifficulty,
  { label: string; labelVi: string; marker: string }
> = {
  easy: { label: 'Easy', labelVi: 'Cơ bản', marker: '◇' },
  medium: { label: 'Medium', labelVi: 'Trung bình', marker: '◆' },
  hard: { label: 'Hard', labelVi: 'Nâng cao', marker: '◆◆' },
  expert: { label: 'Expert', labelVi: 'Chuyên gia', marker: '◆◆◆' },
}

export const SORT_OPTIONS = [
  { value: 'created_at', label: 'Mới nhất' },
  { value: 'due_date', label: 'Hạn chót' },
] as const
