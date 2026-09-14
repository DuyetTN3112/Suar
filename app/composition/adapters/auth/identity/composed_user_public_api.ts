import {
  ComposedUserProfileStatsAdapter,
  type UserLifetimePerformanceStatsPayload,
  type UserReviewedSkillScorePayload,
  type UserSpiderChartSkillPayload,
} from './composed_user_profile_stats_adapter.js'

import type RefreshUserProfileAggregatesCommand from '#modules/users/actions/commands/profile/refresh_user_profile_aggregates_command'
import type UpdateUserProfileCommand from '#modules/users/actions/commands/profile/update_user_profile_command'
import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/profile-skills/user_skill_catalog'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserTalentRepository } from '#modules/users/actions/ports/outbound/user_talent_repository'
import type {
  UserTransaction,
  UserTransactionRunner,
} from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import type { TalentExplainabilitySummary } from '#modules/users/domain/profile/talent_explainability_projection'
import type { UpdateUserProfileDTO } from '#modules/users/public_contracts/update_user_profile_dto'
import type { UserActorIdentityV1 } from '#modules/users/public_contracts/user_actor_identity_v1'
import type { UserModerationIdentityFactV1 } from '#modules/users/public_contracts/user_moderation_identity_fact_v1'
import type { StoredUserSettingData } from '#modules/users/types/stored_user_setting_data'
import type {
  UserCredibilityData,
  UserTalentExplainabilityProjectionV1,
  UserTrustData,
} from '#modules/users/types/user_profile_data'
import type { UserRecord } from '#modules/users/types/user_records'

export type {
  UserLifetimePerformanceStatsPayload,
  UserReviewedSkillScorePayload,
  UserSpiderChartSkillPayload,
}

export type { TalentExplainabilitySummary }
export type TalentExplainabilitySummaryByUserId = Map<string, TalentExplainabilitySummary>

const toEpochMillis = (
  value: string | { toISO(): string | null } | null
): number => {
  const serialized = typeof value === 'string' ? value : value?.toISO() ?? null
  if (!serialized) {
    throw new TypeError('Review account creation timestamp is unavailable')
  }

  const epochMillis = Date.parse(serialized)
  if (!Number.isFinite(epochMillis)) {
    throw new TypeError('Review account creation timestamp is invalid')
  }
  return epochMillis
}

export class ComposedUserPublicApi {
  private readonly profileStats: ComposedUserProfileStatsAdapter

  constructor(
    private readonly users: UserAccountRepository,
    private readonly profiles: UserProfileRepository,
    private readonly talents: UserTalentRepository,
    private readonly transactions: UserTransactionRunner,
    private readonly skillCatalog: UserSkillCatalog,
    private readonly makeRefreshAggregatesCommand: (
      context: UserActionContext
    ) => RefreshUserProfileAggregatesCommand,
    private readonly makeUpdateProfileCommand: (
      context: UserActionContext
    ) => UpdateUserProfileCommand
  ) {
    this.profileStats = new ComposedUserProfileStatsAdapter(this.profiles, this.skillCatalog)
  }

  async findByIds(userIds: string[], columns: string[], trx?: UserTransaction) {
    return this.users.findByIds(userIds, columns, trx)
  }

  async findModerationIdentityFactsV1(
    userIds: string[],
    trx?: UserTransaction
  ): Promise<UserModerationIdentityFactV1[]> {
    const uniqueUserIds = [...new Set(userIds)]
    const users = await this.users.findByIds(
      uniqueUserIds,
      ['id', 'username', 'email'],
      trx
    )

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
    }))
  }

  async findActorIdentityV1(
    userId: string,
    trx?: UserTransaction
  ): Promise<UserActorIdentityV1 | null> {
    const user = await this.users.findById(userId, trx)
    if (!user) {
      return null
    }

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      systemRole: user.system_role,
    }
  }

  async findModerationIdentityIdsByUsername(username: string): Promise<string[]> {
    return this.users.findIdsByUsernameLike(username)
  }

  async findIdsBySearch(search: string): Promise<string[]> {
    return this.users.findIdsBySearch(search)
  }

  async findById(userId: string, trx?: UserTransaction) {
    return this.users.findById(userId, trx)
  }

  async listTalentExplainabilityProjectionTargetIds(
    afterId: string | null,
    limit: number
  ): Promise<string[]> {
    return this.users.listTalentExplainabilityProjectionTargetIds(afterId, limit)
  }

  async getTalentExplainabilitySummaryByUserId(
    userIds: string[]
  ): Promise<TalentExplainabilitySummaryByUserId> {
    return this.talents.getExplainabilitySummaries(userIds)
  }

  async findByEmail(email: string, trx?: UserTransaction) {
    return this.users.findByEmail(email, trx)
  }

  async isActive(userId: string, trx?: UserTransaction): Promise<boolean> {
    return this.users.isActive(userId, trx)
  }

  async getUserSetting(
    userId: string,
    trx?: UserTransaction
  ): Promise<StoredUserSettingData | null> {
    const user = await this.users.findNotDeletedOrFail(userId, trx)
    return user.user_setting
  }

  async updateUserSetting(
    userId: string,
    userSetting: StoredUserSettingData,
    trx?: UserTransaction
  ): Promise<void> {
    await this.users.update(
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
    trx?: UserTransaction
  ): Promise<void> {
    // TODO: public-api write delegation - delegate to an internal user command after module move.
    await this.users.updateCurrentOrganization(userId, organizationId, trx)
  }

  async ensureActiveUser(userId: string, trx?: UserTransaction): Promise<void> {
    await this.users.findActiveOrFail(userId, trx)
  }

  async isExternalContributor(userId: string, trx?: UserTransaction): Promise<boolean> {
    return this.users.isExternalContributor(userId, trx)
  }

  async getSystemRoleName(userId: string, trx?: UserTransaction): Promise<string | null> {
    return this.users.getSystemRoleName(userId, trx)
  }

  async isSystemSuperadmin(userId: string, trx?: UserTransaction): Promise<boolean> {
    return (await this.getSystemRoleName(userId, trx)) === 'superadmin'
  }

  async findNotDeletedOrFail(userId: string, trx?: UserTransaction) {
    return this.users.findNotDeletedOrFail(userId, trx)
  }

  async updateUserProfile(
    dto: UpdateUserProfileDTO,
    execCtx: UserActionContext
  ): Promise<UserRecord> {
    return this.makeUpdateProfileCommand(execCtx).handle(dto)
  }

  async refreshProfileAggregates(
    dto: {
      userId: string
      fullRebuild?: boolean
      periodStart?: string | null
      periodEnd?: string | null
    },
    execCtx: UserActionContext,
    options: {
      trx?: UserTransaction
      signal?: AbortSignal
      deferAuditWrite?: (write: () => Promise<void>) => void
    } = {}
  ) {
    const command = this.makeRefreshAggregatesCommand(execCtx)
    if (options.trx) {
      return command.handleInTransaction(
        dto,
        options.trx,
        {
          ...(options.signal ? { signal: options.signal } : {}),
          ...(options.deferAuditWrite
            ? { deferAuditWrite: options.deferAuditWrite }
            : {}),
        }
      )
    }
    options.signal?.throwIfAborted()
    return command.handle(dto)
  }

  async findReviewAccountInfo(userId: string, trx?: UserTransaction) {
    const user = await this.users.findById(userId, trx)
    if (!user) {
      return null
    }

    return {
      id: user.id,
      createdAtMillis: toEpochMillis(user.created_at),
    }
  }

  async mergeTrustData(
    userId: string,
    trustData: Partial<UserTrustData>,
    trx?: UserTransaction
  ): Promise<void> {
    // TODO: public-api write delegation - delegate to an internal user command after module move.
    await this.users.mergeTrustData(userId, trustData, trx)
  }

  async applyTalentExplainabilityProjectionV1(
    userId: string,
    projection: UserTalentExplainabilityProjectionV1
  ): Promise<boolean> {
    return this.transactions.run((transaction) =>
      this.users.applyTalentExplainabilityProjectionV1(userId, projection, transaction)
    )
  }

  async updateCredibilityData(
    userId: string,
    credibilityData: UserCredibilityData,
    trx?: UserTransaction
  ): Promise<void> {
    // TODO: public-api write delegation - delegate to an internal user command after module move.
    await this.users.updateCredibilityData(userId, { ...credibilityData }, trx)
  }

  async upsertLifetimePerformanceStats(
    userId: string,
    payload: UserLifetimePerformanceStatsPayload,
    trx?: UserTransaction
  ): Promise<void> {
    return this.profileStats.upsertLifetimePerformanceStats(userId, payload, trx)
  }

  async upsertReviewedSkillScore(
    userId: string,
    skillId: string,
    payload: UserReviewedSkillScorePayload,
    trx?: UserTransaction
  ): Promise<{ oldScore: number | null }> {
    return this.profileStats.upsertReviewedSkillScore(userId, skillId, payload, trx)
  }

  async upsertSpiderChartSkillData(
    userId: string,
    skillId: string,
    payload: UserSpiderChartSkillPayload,
    trx?: UserTransaction
  ): Promise<void> {
    return this.profileStats.upsertSpiderChartSkillData(userId, skillId, payload, trx)
  }
}
