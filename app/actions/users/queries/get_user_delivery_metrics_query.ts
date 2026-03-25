import { BaseQuery } from '#actions/shared/base_query'
import UserRepository from '#infra/users/repositories/user_repository'
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
  async handle(dto: GetUserDeliveryMetricsDTO): Promise<UserDeliveryMetricsResult> {
    const cacheKey = `users:delivery_metrics:${dto.user_id}`

    return await this.executeWithCache(cacheKey, 300, async () => {
      // Fetch from repository (Infra Layer)
      const assignments = await UserRepository.findTaskAssignmentsForMetrics(dto.user_id)
      const userSkills = await UserRepository.findUserSkillsForAggregation(dto.user_id)
      const user = await UserRepository.findUserCreatedAt(dto.user_id)

      if (!user) {
        throw new Error(`User ${dto.user_id} not found`)
      }

      // Transform to domain types
      const assignmentData: TaskAssignmentData[] = assignments.map((row) => ({
        id: row.id,
        task_id: row.task_id,
        assignee_id: row.assignee_id,
        assignment_status: row.assignment_status,
        estimated_hours: this.toNullableNumber(row.estimated_hours),
        actual_hours: this.toNullableNumber(row.actual_hours),
        assigned_at: this.toDate(row.assigned_at),
        completed_at: this.toNullableDate(row.completed_at),
        task_due_date: this.toNullableDate(row.task_due_date),
      }))

      const skillData: UserSkillData[] = userSkills.map((row) => ({
        skill_id: row.skill_id,
        skill_name: row.skill_name,
        level_code: row.level_code,
        avg_percentage: this.toNullableNumber(row.avg_percentage),
        total_reviews: row.total_reviews,
        category_code: row.category_code,
      }))

      const createdAt = user.created_at
      const currentDate = new Date()

      // Call pure domain rules to calculate metrics (Domain Layer - pure functions)
      const delivery = calculateDeliveryMetrics({ assignments: assignmentData })
      const skillAggregation = calculateSkillAggregation({ skills: skillData })
      const yearsOfExperience = calculateYearsOfExperience({
        account_created_at: createdAt,
        current_date: currentDate,
      })
      const joinedAtFormatted = formatJoinedDate(createdAt)

      return {
        delivery,
        skill_aggregation: skillAggregation,
        years_of_experience: yearsOfExperience,
        joined_at_formatted: joinedAtFormatted,
      }
    })
  }

  private toNullableNumber(value: number | string | null): number | null {
    if (value === null) {
      return null
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  private toDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value)
  }

  private toNullableDate(value: Date | string | null): Date | null {
    if (value === null) {
      return null
    }
    return this.toDate(value)
  }
}
