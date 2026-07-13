export interface TalentSearchDocument {
  user_id: string
  username: string
  display_name: string
  headline: string | null
  bio: string | null
  status: string
  is_searchable: boolean
  is_active?: boolean
  skill_ids: string[]
  skill_ids_known?: boolean
  skill_ids_count?: number
  skills_text: string
  canonical_skill_ids?: string[]
  canonical_skill_ids_known?: boolean
  canonical_skill_ids_count?: number
  skill_category_refs?: string[]
  skill_category_refs_known?: boolean
  skill_category_refs_count?: number
  approved_skill_aliases_text?: string
  skill_evidence?: Array<{
    skill_id: string
    proficiency_code: string
    proficiency_order: number
    source: string
    review_state: string
  }>
  skill_evidence_known?: boolean
  skill_taxonomy_versions?: string[]
  skill_assignment_provenance?: string[]
  skill_assignment_review_states?: string[]
  accomplishments_text: string
  business_domains: string[]
  business_domains_known?: boolean
  business_domains_count?: number
  problem_categories: string[]
  problem_categories_known?: boolean
  problem_categories_count?: number
  task_types: string[]
  task_types_known?: boolean
  task_types_count?: number
  technologies: string[]
  technologies_known?: boolean
  technologies_count?: number
  trust_score: number
  completed_tasks: number
  reviewed_skills_count: number
  imported_skills_count: number
  under_dispute_skills_count: number
  latest_confidence_signal: 'low' | 'medium' | 'high' | null
  available_from?: string | null
  updated_at: string
}

export interface TalentSearchHit {
  userId: string
  score: number
}
