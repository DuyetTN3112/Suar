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

  const totalTasksCompleted = completed.length

  if (totalTasksCompleted === 0) {
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
  let tasksOnTime = 0
  let tasksLate = 0

  for (const assignment of completed) {
    if (!assignment.completed_at || !assignment.task_due_date) {
      // No due date or completed date => skip
      continue
    }

    if (assignment.completed_at <= assignment.task_due_date) {
      tasksOnTime++
    } else {
      tasksLate++
    }
  }

  const latePercentage =
    tasksOnTime + tasksLate > 0 ? Math.round((tasksLate / (tasksOnTime + tasksLate)) * 100) : 0

  // Calculate estimate accuracy
  let totalAccuracy = 0
  let countWithEstimates = 0
  let totalHoursOver = 0
  let countOver = 0

  for (const assignment of completed) {
    if (
      assignment.estimated_hours !== null &&
      assignment.actual_hours !== null &&
      assignment.estimated_hours > 0
    ) {
      const diff = Math.abs(assignment.actual_hours - assignment.estimated_hours)
      const accuracy = 100 - (diff / assignment.estimated_hours) * 100
      totalAccuracy += Math.max(0, accuracy)
      countWithEstimates++

      if (assignment.actual_hours > assignment.estimated_hours) {
        totalHoursOver += assignment.actual_hours - assignment.estimated_hours
        countOver++
      }
    }
  }

  const estimateAccuracyPercentage =
    countWithEstimates > 0 ? Math.round(totalAccuracy / countWithEstimates) : 100

  const avgHoursOverEstimate =
    countOver > 0 ? Math.round((totalHoursOver / countOver) * 10) / 10 : 0

  return {
    total_tasks_completed: totalTasksCompleted,
    tasks_on_time: tasksOnTime,
    tasks_late: tasksLate,
    late_percentage: latePercentage,
    estimate_accuracy_percentage: estimateAccuracyPercentage,
    avg_hours_over_estimate: avgHoursOverEstimate,
  }
}

/**
 * Calculate skill aggregation metrics.
 *
 * Pure function - no side effects, no DB access.
 */
export function calculateSkillAggregation(ctx: SkillAggregationContext): SkillAggregationResult {
  const totalSkills = ctx.skills.length
  const reviewedSkills = ctx.skills.filter((s) => s.total_reviews > 0).length

  const percentages = ctx.skills
    .map((s) => s.avg_percentage)
    .filter((p): p is number => typeof p === 'number' && Number.isFinite(p))

  const avgPercentage =
    percentages.length > 0
      ? Math.round((percentages.reduce((sum, p) => sum + p, 0) / percentages.length) * 10) / 10
      : null

  return {
    total_skills: totalSkills,
    reviewed_skills: reviewedSkills,
    avg_percentage: avgPercentage,
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
export function formatJoinedDate(date: Date, locale = 'vi-VN'): string {
  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}
