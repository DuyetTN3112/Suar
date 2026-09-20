import type { PagePagination } from '@/apps/org/shared/lib/pagination'

export interface TalentPublicAccomplishment {
  title: string
  concise_statement: string
  action: string
  object: string
  role: string | null
  ownership_level: string
  verification_status: 'verified' | 'partially_verified'
  confidence_band: 'low' | 'medium' | 'high'
  published_at: string
}

export interface TalentBookmark {
  id: string | null
  isSaved: boolean
  notes?: string | null
  folder?: string | null
  rating?: number | null
}

export interface Talent {
  id: string
  username: string
  status?: string
  match_score?: number | null
  skill_match?: number | null
  domain_match?: number | null
  delivery_reliability?: number | null
  trust_score?: number | null
  explanations?: string[]
  risks?: string[]
  reviewed_skills_count?: number
  imported_skills_count?: number
  under_dispute_skills_count?: number
  latest_confidence_signal?: 'low' | 'medium' | 'high' | null
  public_accomplishments?: TalentPublicAccomplishment[]
  bookmark?: TalentBookmark
}

export interface SkillOption {
  id: string
  skill_name: string
  category_code: string
}

export interface TaskOption {
  id: string
  title: string
}

export interface TalentFilters {
  q?: string | null
  task_id?: string | null
  skill_categories?: string[] | string | null
  skill_ids?: string[] | string | null
  business_domain?: string | null
  task_type?: string | null
  problem_category?: string | null
  role_in_task?: string | null
  tech_stack?: string | null
  domain_tags?: string | null
  sort_by?: string | null
  sort_order?: string | null
  saved?: string | null
  min_trust_score?: string | null
  min_completed_tasks?: string | null
  available_before?: string | null
  min_proficiency?: string | null
}

export interface TalentDirectoryProps {
  talents: Talent[]
  filters: TalentFilters
  availableSkills: SkillOption[]
  availableTasks: TaskOption[]
  stats?: { total?: number; saved?: number }
  pagination: PagePagination
  search?: { scope?: string; rankingVersion?: string; normalizedQuery?: string }
  authority?: { total?: { state?: string } }
}
