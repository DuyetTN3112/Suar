export interface UserProfileSettings {
  is_searchable: boolean
  show_contact_info: boolean
  show_organizations: boolean
  show_projects: boolean
  show_spider_chart: boolean
  show_technical_skills: boolean
  custom_headline: string | null
  preferred_job_types: string[]
  preferred_locations: string[]
  min_salary_expectation: number | null
  salary_currency: string
  available_from: string | null
}

export interface UserTrustData {
  current_tier_code: string | null
  calculated_score: number
  raw_score: number
  total_verified_reviews: number
  last_calculated_at: string | null
  scoring_version?: string
  performance_score?: number
  performance_breakdown?: {
    quality_score: number
    delivery_score: number
    difficulty_bonus: number
    consistency_score: number
    calculated_at: string | null
  }
}

export interface UserCredibilityData {
  credibility_score: number
  total_reviews_given: number
  accurate_reviews: number
  disputed_reviews: number
  last_calculated_at: string | null
}
