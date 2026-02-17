
export interface UserSkillAggregationRow {
  avg_percentage: number | string | null
  total_reviews: number
}

export interface TopReviewedSkillRow {
  skill_id: string
  verified_public_proficiency_code: string
  avg_percentage: number | string | null
  total_reviews: number
}

export interface UserCreatedAtRow {
  created_at: Date
}
