import type {
  DatabaseId,
  UserCredibilityData,
  UserProfileSettings,
  UserTrustData,
} from '#types/database'

export type SerializedDateTime = string | null
export interface DateTimeLike {
  toISO(): string | null
}

export interface UserRecord {
  id: DatabaseId
  username: string
  email: string | null
  status: string
  system_role: string
  current_organization_id: DatabaseId | null
  auth_method: 'google' | 'github'
  avatar_url: string | null
  bio: string | null
  phone: string | null
  address: string | null
  timezone: string
  language: string
  is_freelancer: boolean
  freelancer_rating: number | null
  freelancer_completed_tasks_count: number
  profile_settings: UserProfileSettings | null
  trust_data: UserTrustData | null
  credibility_data: UserCredibilityData | null
  deleted_at: SerializedDateTime | DateTimeLike
  created_at: SerializedDateTime | DateTimeLike
  updated_at: SerializedDateTime | DateTimeLike
}

export interface UserSkillRecord {
  id: DatabaseId
  user_id: DatabaseId
  skill_id: DatabaseId
  level_code: string
  total_reviews: number
  avg_score: number | null
  source?: 'imported' | 'reviewed'
  avg_percentage: number | null
  last_calculated_at?: DateTimeLike | null
  last_reviewed_at?: DateTimeLike | null
  skill?: { skill_name: string; category_code: string; [key: string]: unknown }
}

export interface UserProfileRecord extends UserRecord {
  current_organization: { id: DatabaseId; [key: string]: unknown } | null
  skills: UserSkillRecord[]
}

export interface UserProfileSnapshotRecord {
  id: DatabaseId
  user_id: DatabaseId
  version: number
  snapshot_name: string | null
  is_current: boolean
  is_public: boolean
  shareable_slug: string | null
  shareable_token: string | null
}

export interface UserPerformanceStatRecord {
  period_start: DateTimeLike | null
  period_end: DateTimeLike | null
  total_tasks_completed: number
  total_hours_worked: number
  avg_quality_score: number | null
  on_time_delivery_rate: number | null
  avg_days_early_or_late: number | null
  performance_score: number | null
  tasks_by_type: Record<string, number>
  tasks_by_domain: Record<string, number>
  tasks_by_difficulty: Record<string, number>
  tasks_as_lead: number
  tasks_as_sole_contributor: number
  tasks_mentoring_others: number
  longest_on_time_streak: number
  current_on_time_streak: number
  self_assessment_accuracy: number | null
}

export interface UserDomainExpertiseRecord {
  tech_stack_frequency: Record<string, number>
  domain_frequency: Record<string, number>
  problem_category_frequency: Record<string, number>
  top_skills: Record<string, unknown>[]
}

export interface UserWorkHistoryRecord {
  task_assignment_id: DatabaseId
  task_id: DatabaseId
  task_title: string
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  collaboration_type: string | null
  difficulty: string | null
  overall_quality_score: number | null
  was_on_time: boolean | null
  completed_at: DateTimeLike | null
}
