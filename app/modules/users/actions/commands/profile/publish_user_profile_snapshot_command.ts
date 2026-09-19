import { DateTime } from 'luxon'

import type RefreshUserProfileAggregatesCommand from './refresh_user_profile_aggregates_command.js'
import {
  buildUserProfileSnapshotContent,
  type BuiltSnapshotContent,
  type LoadedSnapshotInputs,
  type LoadedSnapshotReadModel,
  type PublishUserProfileSnapshotDTO,
} from './user_profile_snapshot_content_builder.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/profile-skills/user_skill_catalog'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserRuntime } from '#modules/users/actions/ports/outbound/user_runtime'
import type {
  UserTransaction,
  UserTransactionRunner,
} from '#modules/users/actions/ports/outbound/user_transaction'
import { hydrateUserSkillProfileRecords } from '#modules/users/actions/queries/profile-skills/hydrate_user_skill_profile_records_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import type {
  UserProfileSnapshotRecord,
  UserRecord,
} from '#modules/users/types/user_records'

export type { PublishUserProfileSnapshotDTO }

export interface PublishUserProfileSnapshotResult {
  snapshotId: string
  version: number
  shareableSlug: string | null
  shareableToken: string | null
  isPublic: boolean
}

interface PersistedUserProfileSnapshot {
  snapshot: UserProfileSnapshotRecord
  content: BuiltSnapshotContent
}

/**
 * Rate limit: max 3 snapshots per user per 24 hours
 */
const SNAPSHOT_RATE_LIMIT_MAX = 3
const SNAPSHOT_RATE_LIMIT_WINDOW_HOURS = 24

export default class PublishUserProfileSnapshotCommand extends BaseCommand<
  PublishUserProfileSnapshotDTO,
  PublishUserProfileSnapshotResult
> {
  constructor(
    execCtx: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly users: UserAccountRepository,
    private readonly profiles: UserProfileRepository,
    private readonly runtime: UserRuntime,
    private readonly refreshAggregatesCommand: RefreshUserProfileAggregatesCommand,
    private readonly skillCatalog: UserSkillCatalog
  ) {
    super(execCtx, transactions)
  }

  async handle(dto: PublishUserProfileSnapshotDTO): Promise<PublishUserProfileSnapshotResult> {
    const userId = this.getCurrentUserId()

    // Guard: user phải active và không suspended
    const user = await this.users.findNotDeletedOrFail(userId)
    if (user.status === 'suspended') {
      throw new BusinessLogicException('Tài khoản bị suspended không thể publish profile snapshot')
    }
    const userIsActive = await this.users.isActive(userId)
    if (!userIsActive) {
      throw new BusinessLogicException(
        'Tài khoản không active nên không thể publish profile snapshot'
      )
    }

    // Guard: rate limit - max 3 snapshots per 24 hours
    await this.enforceRateLimit(userId)

    await this.refreshAggregates(userId)
    const readModel = await this.loadSnapshotReadModel(userId, dto.isPublic ?? true)

    const result = await this.executeInTransaction(async (trx) => {
      const inputs: LoadedSnapshotInputs = {
        lastSnapshot: await this.loadLastSnapshot(userId, trx),
        readModel,
      }
      const content = buildUserProfileSnapshotContent({
        userId,
        dto,
        inputs,
        createToken: (len) => this.runtime.createToken(len),
      })
      const persisted = await this.persistSnapshot(userId, dto, readModel.user, content, trx)
      return this.toResult(persisted)
    })

    return result
  }

  /**
   * Rate limit: kiểm tra số lượng snapshot trong 24h qua
   */
  private async enforceRateLimit(userId: string): Promise<void> {
    const since = DateTime.now().minus({ hours: SNAPSHOT_RATE_LIMIT_WINDOW_HOURS })
    const recentCount = await this.profiles.countSnapshotsSince(userId, since)
    if (recentCount >= SNAPSHOT_RATE_LIMIT_MAX) {
      throw new BusinessLogicException(
        `Đã vượt quá giới hạn publish snapshot (${SNAPSHOT_RATE_LIMIT_MAX} lần/${SNAPSHOT_RATE_LIMIT_WINDOW_HOURS}h). Vui lòng thử lại sau.`
      )
    }
  }

  private async refreshAggregates(userId: string): Promise<void> {
    await this.refreshAggregatesCommand.handle({
      userId,
      fullRebuild: false,
    })
  }

  private async loadSnapshotReadModel(
    userId: string,
    publicOnly: boolean
  ): Promise<LoadedSnapshotReadModel> {
    const user = await this.users.findNotDeletedOrFail(userId)
    const rawSkills = await this.profiles.listUserSkills(userId)
    const skills = await hydrateUserSkillProfileRecords(rawSkills, this.skillCatalog)
    const performanceStatsRow = await this.profiles.findLatestLifetimePerformanceStat(userId)
    const domainExpertiseRow = await this.profiles.findDomainExpertise(userId)
    const latestHighlights = await this.profiles.listRecentWorkHistory(userId, 6, { publicOnly })

    return {
      user,
      skills,
      performanceStatsRow,
      domainExpertiseRow,
      latestHighlights,
    }
  }

  private async loadLastSnapshot(
    userId: string,
    trx: UserTransaction
  ): Promise<UserProfileSnapshotRecord | null> {
    return this.profiles.findLatestSnapshot(userId, trx)
  }

  private async persistSnapshot(
    userId: string,
    dto: PublishUserProfileSnapshotDTO,
    user: UserRecord,
    content: BuiltSnapshotContent,
    trx: UserTransaction
  ): Promise<PersistedUserProfileSnapshot> {
    await this.profiles.unsetCurrentSnapshot(userId, trx)

    const snapshot = await this.profiles.createSnapshot(
      {
        user_id: userId,
        version: content.nextVersion,
        snapshot_name: dto.snapshotName?.trim() ?? null,
        is_current: true,
        is_public: content.isPublic,
        shareable_slug: content.shareableSlug,
        shareable_token: content.shareableToken,
        summary: content.summary,
        skills_verified: content.verifiedSkills,
        work_highlights: content.workHighlights,
        performance_metrics: content.performanceMetrics,
        trust_metrics: content.trustMetrics,
        scoring_version: user.trust_data?.scoring_version ?? 'v1',
      },
      trx
    )

    if (this.execCtx.userId) {
      await auditPublicApi.write(
        this.execCtx,
        {
          user_id: this.execCtx.userId,
          action: 'publish_profile_snapshot',
          critical: true,
          entity_type: 'user_profile_snapshot',
          entity_id: snapshot.id,
          old_values: null,
          new_values: {
            snapshot_id: snapshot.id,
            version: content.nextVersion,
            is_public: content.isPublic,
            shareable_slug: content.shareableSlug,
          },
        },
        trx
      )
    }

    return {
      snapshot,
      content,
    }
  }

  private toResult(persisted: PersistedUserProfileSnapshot): PublishUserProfileSnapshotResult {
    return {
      snapshotId: persisted.snapshot.id,
      version: persisted.content.nextVersion,
      shareableSlug: persisted.content.shareableSlug,
      shareableToken: persisted.content.shareableToken,
      isPublic: persisted.content.isPublic,
    }
  }
}
