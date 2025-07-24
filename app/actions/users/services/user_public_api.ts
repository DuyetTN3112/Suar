import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import type { UpdateUserProfileDTO } from '../dtos/request/update_user_profile_dto.js'

import type { PolicyResult } from '#domain/policies/policy_result'
import { canToggleAdminMode as canToggleAdminModePolicy } from '#domain/users/user_management_rules'
import cacheService from '#infra/cache/cache_service'
import * as userModelQueries from '#infra/users/repositories/read/model_queries'
import * as performanceStatQueries from '#infra/users/repositories/read/user_performance_stat_queries'
import * as userSkillQueries from '#infra/users/repositories/read/user_skill_queries'
import * as userMutations from '#infra/users/repositories/write/user_mutations'
import * as performanceStatMutations from '#infra/users/repositories/write/user_performance_stat_mutations'
import * as userSkillMutations from '#infra/users/repositories/write/user_skill_mutations'
import type { DatabaseId, UserCredibilityData, UserTrustData } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'
import type { UserRecord } from '#types/user_records'


export interface UserLifetimePerformanceStatsPayload {
  totalCompletedAssignments: number
  totalHoursWorked: number
  qualityMean: number
  deliveryScore: number
  performanceScore: number
  calculatedAt: DateTime
}

export interface UserReviewedSkillScorePayload {
  levelCode: string
  totalReviews: number
  avgScore: number
  avgPercentage: number
  lastReviewedAt: DateTime | null
}

export interface UserSpiderChartSkillPayload {
  avgPercentage: number
  levelCode: string
}

export class UserPublicApi {
  async findByIds(userIds: DatabaseId[], columns: string[], trx?: TransactionClientContract) {
    return userModelQueries.findByIds(userIds, columns, trx)
  }

  async findById(userId: DatabaseId, trx?: TransactionClientContract) {
    return userModelQueries.findById(userId, trx)
  }

  async findByEmail(email: string, trx?: TransactionClientContract) {
    return userModelQueries.findByEmail(email, trx)
  }

  async isActive(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    return userModelQueries.isActive(userId, trx)
  }

  async updateCurrentOrganization(
    userId: DatabaseId,
    organizationId: DatabaseId | null,
    trx?: TransactionClientContract
  ): Promise<void> {
    // TODO: public-api write delegation - delegate to an internal user command after module move.
    await userMutations.updateCurrentOrganization(userId, organizationId, trx)
  }

  async findWithOrganizations(userId: DatabaseId) {
    return userModelQueries.findWithOrganizations(userId)
  }

  async ensureActiveUser(userId: DatabaseId, trx?: TransactionClientContract): Promise<void> {
    await userModelQueries.findActiveOrFail(userId, trx)
  }

  async isFreelancer(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    return userModelQueries.isFreelancer(userId, trx)
  }

  async listUsersByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    return userModelQueries.findByOrganization(organizationId, trx)
  }

  async getSystemRoleName(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    return userModelQueries.getSystemRoleName(userId, trx)
  }

  async isSystemSuperadmin(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return (await this.getSystemRoleName(userId, trx)) === 'superadmin'
  }

  canToggleAdminMode(actorSystemRole: string | null): PolicyResult {
    return canToggleAdminModePolicy(actorSystemRole)
  }

  async invalidatePermissionCache(userId: DatabaseId): Promise<void> {
    await cacheService.deleteByPattern(`perm:*:${userId}*`)
  }

  async findNotDeletedOrFail(userId: DatabaseId, trx?: TransactionClientContract) {
    return userModelQueries.findNotDeletedOrFail(userId, trx)
  }

  async updateUserProfile(dto: UpdateUserProfileDTO, execCtx: ExecutionContext): Promise<UserRecord> {
    const { default: UpdateUserProfileCommand } = await import(
      '../commands/update_user_profile_command.js'
    )
    return new UpdateUserProfileCommand(execCtx).handle(dto)
  }

  async findReviewAccountInfo(userId: DatabaseId, trx?: TransactionClientContract) {
    const user = await userModelQueries.findById(userId, trx)
    if (!user) {
      return null
    }

    return {
      id: user.id,
      createdAtMillis: user.created_at.toMillis(),
    }
  }

  async mergeTrustData(
    userId: DatabaseId,
    trustData: Partial<UserTrustData>,
    trx?: TransactionClientContract
  ): Promise<void> {
    // TODO: public-api write delegation - delegate to an internal user command after module move.
    await userMutations.mergeTrustData(userId, trustData, trx)
  }

  async updateCredibilityData(
    userId: DatabaseId,
    credibilityData: UserCredibilityData,
    trx?: TransactionClientContract
  ): Promise<void> {
    // TODO: public-api write delegation - delegate to an internal user command after module move.
    await userMutations.updateCredibilityData(userId, credibilityData, trx)
  }

  async upsertLifetimePerformanceStats(
    userId: DatabaseId,
    payload: UserLifetimePerformanceStatsPayload,
    trx?: TransactionClientContract
  ): Promise<void> {
    const latestStats = await performanceStatQueries.findLatestLifetimeByUser(userId, trx)
    const data = {
      user_id: userId,
      period_start: null,
      period_end: null,
      total_tasks_completed: payload.totalCompletedAssignments,
      total_hours_worked: Math.round(payload.totalHoursWorked * 100) / 100,
      avg_quality_score: Math.round(payload.qualityMean * 100) / 100,
      on_time_delivery_rate: Math.round(payload.deliveryScore * 100) / 100,
      avg_days_early_or_late: null,
      performance_score: payload.performanceScore,
      tasks_by_type: latestStats?.tasks_by_type ?? {},
      tasks_by_difficulty: latestStats?.tasks_by_difficulty ?? {},
      tasks_by_domain: latestStats?.tasks_by_domain ?? {},
      tasks_as_lead: latestStats?.tasks_as_lead ?? 0,
      tasks_as_sole_contributor: latestStats?.tasks_as_sole_contributor ?? 0,
      tasks_mentoring_others: latestStats?.tasks_mentoring_others ?? 0,
      longest_on_time_streak: latestStats?.longest_on_time_streak ?? 0,
      current_on_time_streak: latestStats?.current_on_time_streak ?? 0,
      self_assessment_accuracy: latestStats?.self_assessment_accuracy ?? null,
      calculated_at: payload.calculatedAt,
    }

    if (latestStats) {
      latestStats.merge(data)
      await performanceStatMutations.save(latestStats, trx)
      return
    }

    await performanceStatMutations.create(data, trx)
  }

  async upsertReviewedSkillScore(
    userId: DatabaseId,
    skillId: DatabaseId,
    payload: UserReviewedSkillScorePayload,
    trx?: TransactionClientContract
  ): Promise<{ oldScore: number | null }> {
    const existing = await userSkillQueries.findByUserAndSkill(userId, skillId, trx)
    const oldScore = existing?.avg_percentage ?? null

    if (existing) {
      existing.level_code = payload.levelCode
      existing.total_reviews = payload.totalReviews
      existing.avg_score = payload.avgScore
      existing.avg_percentage = payload.avgPercentage
      existing.last_calculated_at = DateTime.now()
      existing.last_reviewed_at = payload.lastReviewedAt
      existing.source = 'reviewed'
      await userSkillMutations.save(existing, trx)
      return { oldScore }
    }

    await userSkillMutations.create(
      {
        user_id: userId,
        skill_id: skillId,
        level_code: payload.levelCode,
        total_reviews: payload.totalReviews,
        avg_score: payload.avgScore,
        avg_percentage: payload.avgPercentage,
        last_calculated_at: DateTime.now(),
        last_reviewed_at: payload.lastReviewedAt,
        source: 'reviewed',
      },
      trx
    )

    return { oldScore }
  }

  async upsertSpiderChartSkillData(
    userId: DatabaseId,
    skillId: DatabaseId,
    payload: UserSpiderChartSkillPayload,
    trx?: TransactionClientContract
  ): Promise<void> {
    const existing = await userSkillQueries.findByUserAndSkill(userId, skillId, trx)

    if (existing) {
      existing.avg_percentage = payload.avgPercentage
      existing.level_code = payload.levelCode
      existing.last_calculated_at = DateTime.now()
      await userSkillMutations.save(existing, trx)
      return
    }

    await userSkillMutations.create(
      {
        user_id: userId,
        skill_id: skillId,
        level_code: payload.levelCode,
        avg_percentage: payload.avgPercentage,
        last_calculated_at: DateTime.now(),
        total_reviews: 0,
        avg_score: null,
      },
      trx
    )
  }
}

export const userPublicApi = new UserPublicApi()
