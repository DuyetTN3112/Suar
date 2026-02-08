import type { DatabaseId } from '#types/database'

export interface TaskAssignmentMetricsRow {
  id: DatabaseId
  task_id: DatabaseId
  assignee_id: DatabaseId
  assignment_status: 'active' | 'completed' | 'cancelled'
  estimated_hours: number | string | null
  actual_hours: number | string | null
  assigned_at: Date | string
  completed_at: Date | string | null
  task_due_date: Date | string | null
}

export interface UserSkillAggregationRow {
  skill_id: DatabaseId
  skill_name: string
  level_code: string
  avg_percentage: number | string | null
  total_reviews: number
  category_code: string
}

export interface TopReviewedSkillRow {
  skill_id: DatabaseId
  skill_name: string
  level_code: string
  avg_percentage: number | string | null
  total_reviews: number
}

export interface FeaturedSkillReviewRow {
  reviewer_name: string | null
  reviewer_role: string | null
  rating: number | null
  comment: string | null
  task_id: DatabaseId | null
}

export interface UserCreatedAtRow {
  created_at: Date
}
