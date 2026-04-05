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
  task_visibility: 'external' | 'all'
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
  sort_by: 'created_at' | 'budget' | 'due_date'
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
  { label: string; labelVi: string; color: string }
> = {
  easy: { label: 'Easy', labelVi: 'Dễ', color: 'bg-blue-100 text-blue-800' },
  medium: { label: 'Medium', labelVi: 'Trung bình', color: 'bg-fuchsia-100 text-fuchsia-800' },
  hard: { label: 'Hard', labelVi: 'Khó', color: 'bg-orange-100 text-orange-800' },
  expert: { label: 'Expert', labelVi: 'Chuyên gia', color: 'bg-red-100 text-red-800' },
}

export const SORT_OPTIONS = [
  { value: 'created_at', label: 'Mới nhất' },
  { value: 'budget', label: 'Ngân sách' },
  { value: 'due_date', label: 'Hạn chót' },
] as const
