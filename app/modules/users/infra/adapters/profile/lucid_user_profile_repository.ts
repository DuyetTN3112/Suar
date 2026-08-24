import type { DateTime } from 'luxon'

import type {
  PersistedUserDomainExpertise,
  PersistedUserPerformanceStat,
  PersistedUserProfileSnapshot,
  PersistedUserSkill,
  PersistedUserWorkHistory,
  TopReviewedSkillRow,
  UserCreatedAtRow,
  UserProfileRepository,
  UserSkillAggregationRow,
} from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserTransaction } from '#modules/users/actions/ports/outbound/user_transaction'
import { toLucidUserTransaction } from '#modules/users/infra/adapters/profile/lucid_user_transaction_runner'
import UserDomainExpertise from '#modules/users/infra/models/profile-skills/user_domain_expertise'
import UserPerformanceStat from '#modules/users/infra/models/profile-skills/user_performance_stat'
import UserProfileSnapshot from '#modules/users/infra/models/profile/user_profile_snapshot'
import UserSkill from '#modules/users/infra/models/profile-skills/user_skill'
import UserWorkHistory from '#modules/users/infra/models/profile/user_work_history'
import * as analyticsQueries from '#modules/users/infra/repositories/read/analytics_queries'
import * as domainExpertiseQueries from '#modules/users/infra/repositories/read/user_domain_expertise_queries'
import * as performanceStatQueries from '#modules/users/infra/repositories/read/user_performance_stat_queries'
import * as profileSnapshotQueries from '#modules/users/infra/repositories/read/user_profile_snapshot_queries'
import * as userSkillQueries from '#modules/users/infra/repositories/read/profile-skills/user_skill_queries'
import * as workHistoryQueries from '#modules/users/infra/repositories/read/user_work_history_queries'
import UserAnalyticsRepository from '#modules/users/infra/repositories/profile-skills/user_analytics_repository'
import * as domainExpertiseMutations from '#modules/users/infra/repositories/write/user_domain_expertise_mutations'
import * as performanceStatMutations from '#modules/users/infra/repositories/write/user_performance_stat_mutations'
import { lockUserProfileAggregateRefresh } from '#modules/users/infra/repositories/write/user_profile_aggregate_lock'
import * as profileSnapshotMutations from '#modules/users/infra/repositories/write/user_profile_snapshot_mutations'
import * as userSkillMutations from '#modules/users/infra/repositories/write/profile-skills/user_skill_mutations'
import * as workHistoryMutations from '#modules/users/infra/repositories/write/user_work_history_mutations'
import type { DateTimeLike } from '#modules/users/types/user_records'

function toSkillRecord(userSkill: UserSkill): PersistedUserSkill {
  return {
    ...userSkillQueries.toRecord(userSkill),
    proficiency_level_id: userSkill.proficiency_level_id,
  }
}

function toProfileSnapshotRecord(
  snapshot: UserProfileSnapshot
): PersistedUserProfileSnapshot {
  return {
    id: snapshot.id,
    user_id: snapshot.user_id,
    version: snapshot.version,
    snapshot_name: snapshot.snapshot_name,
    is_current: snapshot.is_current,
    is_public: snapshot.is_public,
    shareable_slug: snapshot.shareable_slug,
    shareable_token: snapshot.shareable_token,
    summary: snapshot.summary,
    skills_verified: snapshot.skills_verified,
    work_highlights: snapshot.work_highlights,
    performance_metrics: snapshot.performance_metrics,
    trust_metrics: snapshot.trust_metrics,
    scoring_version: snapshot.scoring_version,
    created_at: snapshot.created_at,
    updated_at: snapshot.updated_at,
  }
}

export class LucidUserProfileRepository implements UserProfileRepository {
  async findUserSkill(
    userId: string,
    skillId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserSkill | null> {
    const model = await userSkillQueries.findByUserAndSkill(
      userId,
      skillId,
      toLucidUserTransaction(transaction)
    )
    return model ? toSkillRecord(model) : null
  }

  async findOwnedUserSkill(
    userSkillId: string,
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserSkill | null> {
    const model = await userSkillQueries.findOwnedById(
      userSkillId,
      userId,
      toLucidUserTransaction(transaction)
    )
    return model ? toSkillRecord(model) : null
  }

  async listUserSkills(
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserSkill[]> {
    const records = await userSkillQueries.listByUser(
      userId,
      toLucidUserTransaction(transaction)
    )
    return records.map((record) => ({
      ...record,
      proficiency_level_id: null,
    }))
  }

  async createUserSkill(
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserSkill> {
    const model = await userSkillMutations.create(
      data,
      toLucidUserTransaction(transaction)
    )
    return toSkillRecord(model)
  }

  async updateUserSkill(
    userSkillId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserSkill> {
    const lucidTransaction = toLucidUserTransaction(transaction)
    const model = await UserSkill.query(
      lucidTransaction ? { client: lucidTransaction } : undefined
    )
      .where('id', userSkillId)
      .firstOrFail()
    model.merge(data)
    await userSkillMutations.save(model, lucidTransaction)
    return toSkillRecord(model)
  }

  async deleteUserSkill(
    userSkillId: string,
    transaction?: UserTransaction
  ): Promise<void> {
    const lucidTransaction = toLucidUserTransaction(transaction)
    const model = await UserSkill.query(
      lucidTransaction ? { client: lucidTransaction } : undefined
    )
      .where('id', userSkillId)
      .firstOrFail()
    await userSkillMutations.delete(model, lucidTransaction)
  }

  findWorkHistory(
    userId: string,
    taskAssignmentId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserWorkHistory | null> {
    return workHistoryQueries.findByUserAndAssignment(
      userId,
      taskAssignmentId,
      toLucidUserTransaction(transaction)
    )
  }

  listRecentWorkHistory(
    userId: string,
    limit: number,
    options: { publicOnly?: boolean } = {},
    transaction?: UserTransaction
  ): Promise<PersistedUserWorkHistory[]> {
    const trx = toLucidUserTransaction(transaction)
    return workHistoryQueries.listRecentByUser(userId, limit, {
      ...(options.publicOnly !== undefined ? { publicOnly: options.publicOnly } : {}),
      ...(trx ? { trx } : {}),
    })
  }

  listWorkHistory(
    userId: string,
    _options: { publicOnly?: boolean } = {},
    transaction?: UserTransaction
  ): Promise<PersistedUserWorkHistory[]> {
    return workHistoryQueries.listByUser(userId, toLucidUserTransaction(transaction))
  }

  createWorkHistory(
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserWorkHistory> {
    return workHistoryMutations.create(
      data,
      toLucidUserTransaction(transaction)
    )
  }

  async updateWorkHistory(
    workHistoryId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserWorkHistory> {
    const lucidTransaction = toLucidUserTransaction(transaction)
    const model = await UserWorkHistory.query(
      lucidTransaction ? { client: lucidTransaction } : undefined
    )
      .where('id', workHistoryId)
      .firstOrFail()
    model.merge(data)
    return workHistoryMutations.save(model, lucidTransaction)
  }

  async deleteWorkHistoryByUser(
    userId: string,
    transaction?: UserTransaction
  ): Promise<void> {
    await workHistoryMutations.deleteByUser(userId, toLucidUserTransaction(transaction))
  }

  async listPerformanceHistoryRows(
    userId: string,
    period: { periodStartSql: string | null; periodEndSql: string | null },
    transaction: UserTransaction
  ): Promise<Record<string, unknown>[]> {
    const lucidTransaction = toLucidUserTransaction(transaction)
    if (!lucidTransaction) throw new TypeError('Performance aggregation requires a transaction')
    return await UserAnalyticsRepository.listWorkHistoryRows(
      userId,
      period,
      lucidTransaction
    )
  }

  async listDomainExpertiseRows(
    userId: string,
    transaction: UserTransaction
  ): Promise<Record<string, unknown>[]> {
    const lucidTransaction = toLucidUserTransaction(transaction)
    if (!lucidTransaction) throw new TypeError('Domain expertise aggregation requires a transaction')
    return await UserAnalyticsRepository.listDomainExpertiseRows(
      userId,
      lucidTransaction
    )
  }

  findPerformanceStat(
    userId: string,
    periodStart: string | null,
    periodEnd: string | null,
    transaction?: UserTransaction
  ): Promise<PersistedUserPerformanceStat | null> {
    return performanceStatQueries.findByUserAndPeriod(
      userId,
      periodStart,
      periodEnd,
      toLucidUserTransaction(transaction)
    )
  }

  findLatestLifetimePerformanceStat(
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserPerformanceStat | null> {
    return performanceStatQueries.findLatestLifetimeByUser(
      userId,
      toLucidUserTransaction(transaction)
    )
  }

  createPerformanceStat(
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserPerformanceStat> {
    return performanceStatMutations.create(
      data,
      toLucidUserTransaction(transaction)
    )
  }

  async updatePerformanceStat(
    statId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserPerformanceStat> {
    const lucidTransaction = toLucidUserTransaction(transaction)
    const model = await UserPerformanceStat.query(
      lucidTransaction ? { client: lucidTransaction } : undefined
    )
      .where('id', statId)
      .firstOrFail()
    model.merge(data)
    return performanceStatMutations.save(model, lucidTransaction)
  }

  findDomainExpertise(
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserDomainExpertise | null> {
    return domainExpertiseQueries.findByUser(
      userId,
      toLucidUserTransaction(transaction)
    )
  }

  createDomainExpertise(
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserDomainExpertise> {
    return domainExpertiseMutations.create(
      data,
      toLucidUserTransaction(transaction)
    )
  }

  async updateDomainExpertise(
    expertiseId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserDomainExpertise> {
    const lucidTransaction = toLucidUserTransaction(transaction)
    const model = await UserDomainExpertise.query(
      lucidTransaction ? { client: lucidTransaction } : undefined
    )
      .where('id', expertiseId)
      .firstOrFail()
    model.merge(data)
    return domainExpertiseMutations.save(model, lucidTransaction)
  }

  async findCurrentSnapshot(
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot | null> {
    const snapshot = await profileSnapshotQueries.findCurrentByUser(
      userId,
      toLucidUserTransaction(transaction)
    )
    return snapshot ? toProfileSnapshotRecord(snapshot) : null
  }

  async listSnapshots(
    userId: string,
    limit: number,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot[]> {
    const snapshots = await profileSnapshotQueries.listByUser(
      userId,
      limit,
      toLucidUserTransaction(transaction)
    )
    return snapshots.map((snapshot) => toProfileSnapshotRecord(snapshot))
  }

  async findPublicSnapshot(
    slug: string,
    token: string | null,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot | null> {
    const snapshot = await profileSnapshotQueries.findPublicBySlugOrToken(
      slug,
      token,
      toLucidUserTransaction(transaction)
    )
    return snapshot ? toProfileSnapshotRecord(snapshot) : null
  }

  async findOwnedSnapshot(
    snapshotId: string,
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot | null> {
    const snapshot = await profileSnapshotQueries.findOwnedById(
      snapshotId,
      userId,
      toLucidUserTransaction(transaction)
    )
    return snapshot ? toProfileSnapshotRecord(snapshot) : null
  }

  async findLatestSnapshot(
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot | null> {
    const snapshot = await profileSnapshotQueries.findLatestByUser(
      userId,
      toLucidUserTransaction(transaction)
    )
    return snapshot ? toProfileSnapshotRecord(snapshot) : null
  }

  countSnapshotsSince(
    userId: string,
    since: DateTimeLike,
    transaction?: UserTransaction
  ): Promise<number> {
    return profileSnapshotQueries.countByUserSince(
      userId,
      since as DateTime,
      toLucidUserTransaction(transaction)
    )
  }

  snapshotSlugExists(
    slug: string,
    excludeSnapshotId?: string,
    transaction?: UserTransaction
  ): Promise<boolean> {
    return profileSnapshotQueries.slugExists(
      slug,
      excludeSnapshotId,
      toLucidUserTransaction(transaction)
    )
  }

  async unsetCurrentSnapshot(
    userId: string,
    transaction?: UserTransaction
  ): Promise<void> {
    await profileSnapshotMutations.unsetCurrentByUser(
      userId,
      toLucidUserTransaction(transaction)
    )
  }

  async createSnapshot(
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot> {
    const snapshot = await profileSnapshotMutations.create(
      data,
      toLucidUserTransaction(transaction)
    )
    return toProfileSnapshotRecord(snapshot)
  }

  async updateSnapshot(
    snapshotId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot> {
    const lucidTransaction = toLucidUserTransaction(transaction)
    const model = await UserProfileSnapshot.query(
      lucidTransaction ? { client: lucidTransaction } : undefined
    )
      .where('id', snapshotId)
      .firstOrFail()
    model.merge(data)
    const snapshot = await profileSnapshotMutations.save(model, lucidTransaction)
    return toProfileSnapshotRecord(snapshot)
  }

  findUserSkillsForAggregation(userId: string): Promise<UserSkillAggregationRow[]> {
    return analyticsQueries.findUserSkillsForAggregation(userId)
  }

  findTopReviewedSkills(userId: string, limit: number): Promise<TopReviewedSkillRow[]> {
    return analyticsQueries.findTopReviewedSkills(userId, limit)
  }

  findUserCreatedAt(userId: string): Promise<UserCreatedAtRow | null> {
    return analyticsQueries.findUserCreatedAt(userId)
  }

  lockProfileAggregateRefresh(
    userId: string,
    transaction: UserTransaction
  ): Promise<void> {
    const lucidTransaction = toLucidUserTransaction(transaction)
    if (!lucidTransaction) throw new TypeError('Profile aggregate lock requires a transaction')
    return lockUserProfileAggregateRefresh(userId, lucidTransaction)
  }
}
