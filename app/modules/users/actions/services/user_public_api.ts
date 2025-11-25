import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import type { UpdateUserProfileDTO } from '../dtos/request/update_user_profile_dto.js'

import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { UserSettingData } from '#modules/settings/types/user_setting'
import { skillPublicApi } from '#modules/skills/actions/services/skill_public_api'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as performanceStatQueries from '#modules/users/infra/repositories/read/user_performance_stat_queries'
import * as userSkillQueries from '#modules/users/infra/repositories/read/user_skill_queries'
import UserRepository from '#modules/users/infra/repositories/user_repository'
import * as userMutations from '#modules/users/infra/repositories/write/user_mutations'
import * as performanceStatMutations from '#modules/users/infra/repositories/write/user_performance_stat_mutations'
import * as userSkillMutations from '#modules/users/infra/repositories/write/user_skill_mutations'
import { canToggleAdminMode as canToggleAdminModePolicy } from '#modules/users/public_contracts/user_management_rules'
import type { UserCredibilityData, UserTrustData } from '#modules/users/types/user_profile_data'
import type { UserRecord } from '#modules/users/types/user_records'


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

export interface SocialLoginUserPayload {
  email: string
  username: string
  status: string
  system_role: string
  current_organization_id: null
  auth_method: 'google' | 'github'
}

export interface AdminUserListFilters {
  search?: string
  systemRole?: string
  status?: string
}

export interface AdminUserListResult {
  users: Awaited<ReturnType<typeof userModelQueries.findByIds>>
  total: number
}

export interface DashboardUserStats {
  total: number
  active: number
  suspended: number
  newThisMonth: number
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export class UserPublicApi {
  async findByIds(userIds: string[], columns: string[], trx?: TransactionClientContract) {
    return userModelQueries.findByIds(userIds, columns, trx)
  }

  async findIdsBySearch(search: string): Promise<string[]> {
    const users = await userModelQueries
      .queryNotDeleted()
      .select('id')
      .where((query) => {
        void query.where('username', 'ilike', `%${search}%`).orWhere('email', 'ilike', `%${search}%`)
      })

    return users.map((user) => user.id)
  }

  async findById(userId: string, trx?: TransactionClientContract) {
    return userModelQueries.findById(userId, trx)
  }

  async findByEmail(email: string, trx?: TransactionClientContract) {
    return userModelQueries.findByEmail(email, trx)
  }

  async listUsersForAdmin(
    filters: AdminUserListFilters,
    page: number,
    perPage: number
  ): Promise<AdminUserListResult> {
    const query = userModelQueries.queryNotDeleted()

    const search = filters.search
    if (search) {
      void query.where((searchQuery) => {
        void searchQuery
          .where('username', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`)
      })
    }

    if (filters.systemRole) {
      void query.where('system_role', filters.systemRole)
    }

    if (filters.status) {
      void query.where('status', filters.status)
    }

    void query.orderBy('created_at', 'desc')
    const result = await query.paginate(page, perPage)

    return {
      users: result.all(),
      total: result.total,
    }
  }

  async getUserStatsForAdmin(): Promise<DashboardUserStats> {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const statsResults = (await Promise.all([
      db.from('users').count('* as total').whereNull('deleted_at').first(),
      db
        .from('users')
        .count('* as total')
        .where('status', 'active')
        .whereNull('deleted_at')
        .first(),
      db
        .from('users')
        .count('* as total')
        .where('status', 'suspended')
        .whereNull('deleted_at')
        .first(),
      db
        .from('users')
        .count('* as total')
        .where('created_at', '>=', firstDayOfMonth)
        .whereNull('deleted_at')
        .first(),
    ])) as unknown[]

    const total = statsResults[0]
    const active = statsResults[1]
    const suspended = statsResults[2]
    const newThisMonth = statsResults[3]

    return {
      total: isRecord(total) ? toNumberValue(total.total) : 0,
      active: isRecord(active) ? toNumberValue(active.total) : 0,
      suspended: isRecord(suspended) ? toNumberValue(suspended.total) : 0,
      newThisMonth: isRecord(newThisMonth) ? toNumberValue(newThisMonth.total) : 0,
    }
  }

  async createSocialLoginUser(
    payload: SocialLoginUserPayload,
    trx?: TransactionClientContract
  ) {
    return userMutations.create({ ...payload }, trx)
  }

  async updateAuthMethod(
    user: NonNullable<Awaited<ReturnType<typeof userModelQueries.findByEmail>>>,
    authMethod: 'google' | 'github',
    trx?: TransactionClientContract
  ) {
    user.auth_method = authMethod
    return UserRepository.save(user, trx)
  }

  async updateSystemRoleForAdmin(userId: string, systemRole: string): Promise<void> {
    const user = await userModelQueries.findNotDeletedOrFail(userId)
    user.system_role = systemRole
    await userMutations.save(user)
  }

  async suspendUserForAdmin(userId: string): Promise<void> {
    const user = await userModelQueries.findNotDeletedOrFail(userId)
    user.status = 'suspended'
    await userMutations.save(user)
  }

  async activateUserForAdmin(userId: string): Promise<void> {
    const user = await userModelQueries.findNotDeletedOrFail(userId)
    user.status = 'active'
    await userMutations.save(user)
  }

  async isActive(userId: string, trx?: TransactionClientContract): Promise<boolean> {
    return userModelQueries.isActive(userId, trx)
  }

  async getUserSetting(userId: string, trx?: TransactionClientContract): Promise<UserSettingData | null> {
    const user = await userModelQueries.findNotDeletedOrFail(userId, trx)
    return user.user_setting
  }

  async updateUserSetting(
    userId: string,
    userSetting: UserSettingData,
    trx?: TransactionClientContract
  ): Promise<void> {
    await userMutations.updateByIdRecord(
      userId,
      {
        user_setting: userSetting,
      },
      trx
    )
  }

  async updateCurrentOrganization(
    userId: string,
    organizationId: string | null,
    trx?: TransactionClientContract
  ): Promise<void> {
    // TODO: public-api write delegation - delegate to an internal user command after module move.
    await userMutations.updateCurrentOrganization(userId, organizationId, trx)
  }

  async findWithOrganizations(userId: string) {
    return userModelQueries.findWithOrganizations(userId)
  }

  async ensureActiveUser(userId: string, trx?: TransactionClientContract): Promise<void> {
    await userModelQueries.findActiveOrFail(userId, trx)
  }

  async isFreelancer(userId: string, trx?: TransactionClientContract): Promise<boolean> {
    return userModelQueries.isFreelancer(userId, trx)
  }

  async listUsersByOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ) {
    return userModelQueries.findByOrganization(organizationId, trx)
  }

  async getSystemRoleName(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    return userModelQueries.getSystemRoleName(userId, trx)
  }

  async isSystemSuperadmin(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return (await this.getSystemRoleName(userId, trx)) === 'superadmin'
  }

  canToggleAdminMode(actorSystemRole: string | null): PolicyResult {
    return canToggleAdminModePolicy(actorSystemRole)
  }

  async invalidatePermissionCache(userId: string): Promise<void> {
    await cacheStore.deleteByPattern(`perm:*:${userId}*`)
  }

  async findNotDeletedOrFail(userId: string, trx?: TransactionClientContract) {
    return userModelQueries.findNotDeletedOrFail(userId, trx)
  }

  async updateUserProfile(dto: UpdateUserProfileDTO, execCtx: UserActionContext): Promise<UserRecord> {
    const { default: UpdateUserProfileCommand } = await import(
      '../commands/update_user_profile_command.js'
    )
    return new UpdateUserProfileCommand(execCtx).handle(dto)
  }

  async findReviewAccountInfo(userId: string, trx?: TransactionClientContract) {
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
    userId: string,
    trustData: Partial<UserTrustData>,
    trx?: TransactionClientContract
  ): Promise<void> {
    // TODO: public-api write delegation - delegate to an internal user command after module move.
    await userMutations.mergeTrustData(userId, trustData, trx)
  }

  async updateCredibilityData(
    userId: string,
    credibilityData: UserCredibilityData,
    trx?: TransactionClientContract
  ): Promise<void> {
    // TODO: public-api write delegation - delegate to an internal user command after module move.
    await userMutations.updateCredibilityData(userId, credibilityData, trx)
  }

  async upsertLifetimePerformanceStats(
    userId: string,
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
    userId: string,
    skillId: string,
    payload: UserReviewedSkillScorePayload,
    trx?: TransactionClientContract
  ): Promise<{ oldScore: number | null }> {
    const existing = await userSkillQueries.findByUserAndSkill(userId, skillId, trx)
    const oldScore = existing?.avg_percentage ?? null

    const activeScale = await skillPublicApi.proficiencyScale.getActiveScaleWithLevels(trx)
    const matchedLevel = activeScale?.levels.find((level) => level.code === payload.levelCode)
    const proficiencyLevelId = matchedLevel ? matchedLevel.id : null

    if (existing) {
      existing.level_code = payload.levelCode
      existing.proficiency_level_id = proficiencyLevelId
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
        proficiency_level_id: proficiencyLevelId,
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
    userId: string,
    skillId: string,
    payload: UserSpiderChartSkillPayload,
    trx?: TransactionClientContract
  ): Promise<void> {
    const existing = await userSkillQueries.findByUserAndSkill(userId, skillId, trx)

    const activeScale = await skillPublicApi.proficiencyScale.getActiveScaleWithLevels(trx)
    const matchedLevel = activeScale?.levels.find((level) => level.code === payload.levelCode)
    const proficiencyLevelId = matchedLevel ? matchedLevel.id : null

    if (existing) {
      existing.avg_percentage = payload.avgPercentage
      existing.level_code = payload.levelCode
      existing.proficiency_level_id = proficiencyLevelId
      existing.last_calculated_at = DateTime.now()
      await userSkillMutations.save(existing, trx)
      return
    }

    await userSkillMutations.create(
      {
        user_id: userId,
        skill_id: skillId,
        level_code: payload.levelCode,
        proficiency_level_id: proficiencyLevelId,
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
