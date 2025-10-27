export interface SkillSearchDocument {
  skill_id: string
  skill_code: string
  skill_name: string
  category_code: string | null
  display_type: string | null
  description: string | null
  is_active: boolean
  updated_at: string
}

export interface SkillSearchHit {
  skillId: string
  score: number
}
