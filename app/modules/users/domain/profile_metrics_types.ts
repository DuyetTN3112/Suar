/**
 * Profile Metrics Types — Plain data interfaces for profile calculations.
 *
 * 100% pure, no framework dependencies.
 * Used as input to profile metrics calculation functions.
 *
 * @module ProfileMetricsTypes
 */

import type { DatabaseId } from '#types/database'

/**
 * Raw task assignment data for metrics calculation
 */
export interface TaskAssignmentData {
  id: DatabaseId
  task_id: DatabaseId
  assignee_id: DatabaseId
  assignment_status: 'active' | 'completed' | 'cancelled'
  estimated_hours: number | null
  actual_hours: number | null
  assigned_at: Date
  completed_at: Date | null
  task_due_date: Date | null
}

/**
 * User skill data for metrics calculation
 */
export interface UserSkillData {
  skill_id: DatabaseId
  skill_name: string
  level_code: string
  avg_percentage: number | null
  total_reviews: number
  category_code: string
}

/**
 * Context for delivery metrics calculation
 */
export interface DeliveryMetricsContext {
  assignments: TaskAssignmentData[]
}

/**
 * Result of delivery metrics calculation
 */
export interface DeliveryMetricsResult {
  total_tasks_completed: number
  tasks_on_time: number
  tasks_late: number
  late_percentage: number
  estimate_accuracy_percentage: number
  avg_hours_over_estimate: number
}

/**
 * Context for skill aggregation calculation
 */
export interface SkillAggregationContext {
  skills: UserSkillData[]
}

/**
 * Result of skill aggregation
 */
export interface SkillAggregationResult {
  total_skills: number
  reviewed_skills: number
  avg_percentage: number | null
}

/**
 * Context for years of experience calculation
 */
export interface ExperienceContext {
  account_created_at: Date
  current_date: Date
}
