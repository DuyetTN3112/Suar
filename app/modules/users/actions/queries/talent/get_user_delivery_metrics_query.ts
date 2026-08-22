import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseQuery } from '#modules/users/actions/base_query'
import type { UserAssignmentDeliveryFactReader } from '#modules/users/actions/ports/outbound/user_assignment_delivery_fact_reader'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import {
  calculateDeliveryMetrics,
  calculateSkillAggregation,
  calculateYearsOfExperience,
  formatJoinedDate,
} from '#modules/users/domain/profile/profile_metrics_rules'
import type {
  DeliveryMetricsResult,
  SkillAggregationResult,
  TaskAssignmentData,
  UserSkillData,
} from '#modules/users/domain/profile/profile_metrics_types'

/**
 * GetUserDeliveryMetricsDTO
 */
export class GetUserDeliveryMetricsDTO {
  declare user_id: string

  constructor(userId: string) {
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
  constructor(
    execCtx: UserActionContext,
    private readonly assignmentDeliveryFactReader: UserAssignmentDeliveryFactReader,
    private readonly profiles: UserProfileRepository
  ) {
    super(execCtx)
  }

  async handle(dto: GetUserDeliveryMetricsDTO): Promise<UserDeliveryMetricsResult> {
    const cacheKey = `users:delivery_metrics:${dto.user_id}`

    return await this.executeWithCache(cacheKey, 300, async () => {
      // Fetch from repository (Infra Layer)
      const assignments =
        await this.assignmentDeliveryFactReader.listAssignmentDeliveryFacts(dto.user_id)
      const userSkills = await this.profiles.findUserSkillsForAggregation(dto.user_id)
      const user = await this.profiles.findUserCreatedAt(dto.user_id)

      if (!user) {
        throw NotFoundException.user(dto.user_id)
      }

      // Transform to domain types
      const assignmentData: TaskAssignmentData[] = assignments.map((row) => ({
        id: row.assignmentId,
        task_id: row.taskId,
        assignee_id: row.assigneeId,
        assignment_status: row.assignmentStatus,
        estimated_hours: row.estimatedHours,
        actual_hours: row.actualHours,
        assigned_at: this.toDate(row.assignedAt),
        completed_at: this.toNullableDate(row.completedAt),
        task_due_date: this.toNullableDate(row.taskDueDate),
      }))

      const skillData: UserSkillData[] = userSkills.map((row) => ({
        avg_percentage: this.toNullableNumber(row.avg_percentage),
        total_reviews: row.total_reviews,
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
