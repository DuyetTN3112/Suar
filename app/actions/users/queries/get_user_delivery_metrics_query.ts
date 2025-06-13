import type { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import UserRepository from '#infra/users/repositories/user_repository'
import db from '@adonisjs/lucid/services/db'
import type { DatabaseId } from '#types/database'
import {
  calculateDeliveryMetrics,
  calculateSkillAggregation,
  calculateYearsOfExperience,
  formatJoinedDate,
} from '#domain/users/profile_metrics_rules'
import type {
  DeliveryMetricsResult,
  SkillAggregationResult,
  TaskAssignmentData,
  UserSkillData,
} from '#domain/users/profile_metrics_types'

/**
 * GetUserDeliveryMetricsDTO
 */
export class GetUserDeliveryMetricsDTO {
  declare user_id: DatabaseId

  constructor(userId: DatabaseId) {
    this.user_id = userId
  }
}

/**
 * Result interface for user delivery metrics
 */
export interface UserDeliveryMetricsResult {
  delivery: DeliveryMetricsResult
  skill_aggregation: SkillAggregationResult
  years_of_experience: number
  joined_at_formatted: string
}

/**
 * GetUserDeliveryMetricsQuery
 *
 * Fetches task assignments and calculates delivery metrics using pure domain rules.
 *
 * CQRS Pattern: Read operation (Application Layer - Orchestration)
 * Uses repository for data access (Infra Layer)
 * Uses domain rules for business logic calculation (Domain Layer - pure functions)
 * Uses caching for performance (5 min TTL)
 */
export default class GetUserDeliveryMetricsQuery extends BaseQuery<
  GetUserDeliveryMetricsDTO,
  UserDeliveryMetricsResult
> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: GetUserDeliveryMetricsDTO): Promise<UserDeliveryMetricsResult> {
    const cacheKey = `users:delivery_metrics:${String(dto.user_id)}`

    return await this.executeWithCache(cacheKey, 300, async () => {
      // Fetch from repository (Infra Layer)
      const [assignments, userSkills, user] = await Promise.all([
        UserRepository.findTaskAssignmentsForMetrics(dto.user_id),
        UserRepository.findUserSkillsForAggregation(dto.user_id),
        db.from('users').where('id', dto.user_id).select('created_at').first(),
      ])

      if (!user) {
        throw new Error(`User ${String(dto.user_id)} not found`)
      }

      // Transform to domain types
      const assignmentData: TaskAssignmentData[] = assignments.map((row) => ({
        id: String(row.id),
        task_id: String(row.task_id),
        assignee_id: String(row.assignee_id),
        assignment_status: row.assignment_status,
        estimated_hours: row.estimated_hours,
        actual_hours: row.actual_hours,
        assigned_at: new Date(row.assigned_at),
        completed_at: row.completed_at ? new Date(row.completed_at) : null,
        task_due_date: row.task_due_date ? new Date(row.task_due_date) : null,
      }))

      const skillData: UserSkillData[] = userSkills.map((row) => ({
        skill_id: String(row.skill_id),
        skill_name: row.skill_name,
        level_code: row.level_code,
        avg_percentage: row.avg_percentage,
        total_reviews: row.total_reviews,
        category_code: row.category_code,
      }))

      const createdAt = new Date(user.created_at)
      const currentDate = new Date()

      // Call pure domain rules to calculate metrics (Domain Layer - pure functions)
      const delivery = calculateDeliveryMetrics({ assignments: assignmentData })
      const skill_aggregation = calculateSkillAggregation({ skills: skillData })
      const years_of_experience = calculateYearsOfExperience({
        account_created_at: createdAt,
        current_date: currentDate,
      })
      const joined_at_formatted = formatJoinedDate(createdAt)

      return {
        delivery,
        skill_aggregation,
        years_of_experience,
        joined_at_formatted,
      }
    })
  }
}
