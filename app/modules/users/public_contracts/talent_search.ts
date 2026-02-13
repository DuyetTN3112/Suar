import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'

export interface SearchTalentsDTO {
  q?: string
  task_id?: string
  skill_categories?: string[] | null
  skill_ids?: string[] | null
  business_domain?: string | null
  task_type?: string | null
  problem_category?: string | null
  role_in_task?: string | null
  tech_stack?: string | null
  domain_tags?: string | null
  sort_by?: 'relevance' | 'trust_score' | 'completed_tasks' | 'name'
  sort_order?: 'asc' | 'desc'
  saved?: boolean
  min_trust_score?: number
  min_completed_tasks?: number
  page?: number
  per_page?: number
}

export interface TalentSearchResult {
  id: string
  username: string
  status: string
  match_score?: number
  skill_match?: number
  domain_match?: number
  delivery_reliability?: number
  trust_score?: number
  explanations?: string[]
  risks?: string[]
  avatar_url?: string | null
  bio?: string | null
  custom_headline?: string | null
  completed_tasks?: number
  reviewed_skills_count?: number
  imported_skills_count?: number
  under_dispute_skills_count?: number
  latest_confidence_signal?: 'low' | 'medium' | 'high' | null
}

export interface TalentSearchCapability {
  search(
    input: SearchTalentsDTO,
    execCtx: HttpActionContext,
    signal?: AbortSignal
  ): Promise<TalentSearchResult[]>
}
