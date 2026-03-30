export interface TalentSearchDocument {
  user_id: string
  username: string
  display_name: string
  headline: string | null
  bio: string | null
  status: string
  is_searchable: boolean
  skill_ids: string[]
  skills_text: string
  business_domains: string[]
  problem_categories: string[]
  task_types: string[]
  trust_score: number
  completed_tasks: number
  reviewed_skills_count: number
  imported_skills_count: number
  under_dispute_skills_count: number
  latest_confidence_signal: 'low' | 'medium' | 'high' | null
  updated_at: string
}

export interface TalentSearchHit {
  userId: string
  score: number
}
