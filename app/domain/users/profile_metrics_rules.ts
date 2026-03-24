/**
 * Profile Metrics Rules — Pure business rules for profile metrics calculation.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 * They take pre-fetched data and return calculated metrics.
 *
 * @module ProfileMetricsRules
 */

import type {
  DeliveryMetricsContext,
  DeliveryMetricsResult,
  SkillAggregationContext,
  SkillAggregationResult,
  ExperienceContext,
} from './profile_metrics_types.js'

/**
 * Calculate delivery metrics from task assignments.
 *
 * Pure function - no side effects, no DB access.
 *
 * Metrics calculated:
 * - Total completed tasks
 * - Tasks completed on time (completed_at <= due_date)
 * - Tasks completed late (completed_at > due_date)
 * - Late percentage
 * - Estimate accuracy (avg of |actual - estimated| / estimated * 100)
 * - Average hours over estimate
 */
export function calculateDeliveryMetrics(ctx: DeliveryMetricsContext): DeliveryMetricsResult {
  const completed = ctx.assignments.filter((a) => a.assignment_status === 'completed')

  const total_tasks_completed = completed.length

  if (total_tasks_completed === 0) {
    return {
      total_tasks_completed: 0,
      tasks_on_time: 0,
      tasks_late: 0,
      late_percentage: 0,
      estimate_accuracy_percentage: 100,
      avg_hours_over_estimate: 0,
    }
  }

  // Calculate on-time vs late
  let tasks_on_time = 0
  let tasks_late = 0

  for (const assignment of completed) {
    if (!assignment.completed_at || !assignment.task_due_date) {
      // No due date or completed date => skip
      continue
    }

    if (assignment.completed_at <= assignment.task_due_date) {
      tasks_on_time++
    } else {
      tasks_late++
    }
  }

  const late_percentage =
    tasks_on_time + tasks_late > 0
      ? Math.round((tasks_late / (tasks_on_time + tasks_late)) * 100)
      : 0

  // Calculate estimate accuracy
  let total_accuracy = 0
  let count_with_estimates = 0
  let total_hours_over = 0
  let count_over = 0

  for (const assignment of completed) {
    if (
      assignment.estimated_hours !== null &&
      assignment.actual_hours !== null &&
      assignment.estimated_hours > 0
    ) {
      const diff = Math.abs(assignment.actual_hours - assignment.estimated_hours)
      const accuracy = 100 - (diff / assignment.estimated_hours) * 100
      total_accuracy += Math.max(0, accuracy)
      count_with_estimates++

      if (assignment.actual_hours > assignment.estimated_hours) {
        total_hours_over += assignment.actual_hours - assignment.estimated_hours
        count_over++
      }
    }
  }

  const estimate_accuracy_percentage =
    count_with_estimates > 0 ? Math.round(total_accuracy / count_with_estimates) : 100

  const avg_hours_over_estimate =
    count_over > 0 ? Math.round((total_hours_over / count_over) * 10) / 10 : 0

  return {
    total_tasks_completed,
    tasks_on_time,
    tasks_late,
    late_percentage,
    estimate_accuracy_percentage,
    avg_hours_over_estimate,
  }
}

/**
 * Calculate skill aggregation metrics.
 *
 * Pure function - no side effects, no DB access.
 */
export function calculateSkillAggregation(ctx: SkillAggregationContext): SkillAggregationResult {
  const total_skills = ctx.skills.length
  const reviewed_skills = ctx.skills.filter((s) => s.total_reviews > 0).length

  const percentages = ctx.skills
    .map((s) => s.avg_percentage)
    .filter((p): p is number => typeof p === 'number' && Number.isFinite(p))

  const avg_percentage =
    percentages.length > 0
      ? Math.round((percentages.reduce((sum, p) => sum + p, 0) / percentages.length) * 10) / 10
      : null

  return {
    total_skills,
    reviewed_skills,
    avg_percentage,
  }
}

/**
 * Calculate years of experience from account creation date.
 *
 * Pure function - takes explicit dates, no Date.now() inside.
 */
export function calculateYearsOfExperience(ctx: ExperienceContext): number {
  const diffMs = ctx.current_date.getTime() - ctx.account_created_at.getTime()
  const years = diffMs / (365.25 * 24 * 60 * 60 * 1000)
  return Math.max(1, Math.floor(years))
}

/**
 * Format joined date for display.
 *
 * Pure function - takes explicit date, returns formatted string.
 */
export function formatJoinedDate(date: Date, locale: string = 'vi-VN'): string {
  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}
