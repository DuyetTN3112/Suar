import type { UserTransaction } from './user_transaction.js'

import type {
  DateTimeLike,
  UserDomainExpertiseRecord,
  UserPerformanceStatRecord,
  UserProfileSnapshotRecord,
  UserSkillRecord,
  UserWorkHistoryRecord,
} from '#modules/users/types/user_records'

export interface UserSkillAggregationRow {
  avg_percentage: number | string | null
  total_reviews: number
}

export interface TopReviewedSkillRow {
  skill_id: string
  verified_public_proficiency_code: string
  avg_percentage: number | string | null
  total_reviews: number
}

export interface UserCreatedAtRow {
  created_at: Date
}

export interface PersistedUserSkill extends UserSkillRecord {
  proficiency_level_id: string | null
}

export interface PersistedUserWorkHistory extends UserWorkHistoryRecord {
  id: string
  user_id: string
  is_featured: boolean
  is_public: boolean
  tech_stack?: unknown
  domain_tags?: unknown
  role_in_task: string | null
  collaboration_type: string | null
  actual_hours?: number | string | null
  days_early_or_late?: number | string | null
  skill_scores: Record<string, unknown>[]
  evidence_links: Record<string, unknown>[]
}

export interface PersistedUserPerformanceStat extends UserPerformanceStatRecord {
  id: string
}

export interface PersistedUserDomainExpertise extends UserDomainExpertiseRecord {
  id: string
}

export interface PersistedUserProfileSnapshot extends UserProfileSnapshotRecord {
  summary?: Record<string, unknown> | null
  skills_verified?: unknown[] | null
  work_highlights?: unknown[] | null
  performance_metrics?: Record<string, unknown> | null
  trust_metrics?: Record<string, unknown> | null
  scoring_version?: string
  created_at?: DateTimeLike | string | null
  updated_at?: DateTimeLike | string | null
}

export interface UserProfileRepository {
  findUserSkill(
    userId: string,
    skillId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserSkill | null>
  findOwnedUserSkill(
    userSkillId: string,
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserSkill | null>
  listUserSkills(
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserSkill[]>
  createUserSkill(
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserSkill>
  updateUserSkill(
    userSkillId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserSkill>
  deleteUserSkill(userSkillId: string, transaction?: UserTransaction): Promise<void>

  findWorkHistory(
    userId: string,
    taskAssignmentId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserWorkHistory | null>
  listRecentWorkHistory(
    userId: string,
    limit: number,
    options?: { publicOnly?: boolean },
    transaction?: UserTransaction
  ): Promise<PersistedUserWorkHistory[]>
  listWorkHistory(
    userId: string,
    options?: { publicOnly?: boolean },
    transaction?: UserTransaction
  ): Promise<PersistedUserWorkHistory[]>
  createWorkHistory(
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserWorkHistory>
  updateWorkHistory(
    workHistoryId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserWorkHistory>
  deleteWorkHistoryByUser(userId: string, transaction?: UserTransaction): Promise<void>
  listPerformanceHistoryRows(
    userId: string,
    period: { periodStartSql: string | null; periodEndSql: string | null },
    transaction: UserTransaction
  ): Promise<Record<string, unknown>[]>
  listDomainExpertiseRows(
    userId: string,
    transaction: UserTransaction
  ): Promise<Record<string, unknown>[]>

  findPerformanceStat(
    userId: string,
    periodStart: string | null,
    periodEnd: string | null,
    transaction?: UserTransaction
  ): Promise<PersistedUserPerformanceStat | null>
  findLatestLifetimePerformanceStat(
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserPerformanceStat | null>
  createPerformanceStat(
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserPerformanceStat>
  updatePerformanceStat(
    statId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserPerformanceStat>

  findDomainExpertise(
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserDomainExpertise | null>
  createDomainExpertise(
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserDomainExpertise>
  updateDomainExpertise(
    expertiseId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserDomainExpertise>

  findCurrentSnapshot(
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot | null>
  listSnapshots(
    userId: string,
    limit: number,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot[]>
  findPublicSnapshot(
    slug: string,
    token: string | null,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot | null>
  findOwnedSnapshot(
    snapshotId: string,
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot | null>
  findLatestSnapshot(
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot | null>
  countSnapshotsSince(
    userId: string,
    since: DateTimeLike,
    transaction?: UserTransaction
  ): Promise<number>
  snapshotSlugExists(
    slug: string,
    excludeSnapshotId?: string,
    transaction?: UserTransaction
  ): Promise<boolean>
  unsetCurrentSnapshot(userId: string, transaction?: UserTransaction): Promise<void>
  createSnapshot(
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot>
  updateSnapshot(
    snapshotId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot>

  findUserSkillsForAggregation(userId: string): Promise<UserSkillAggregationRow[]>
  findTopReviewedSkills(userId: string, limit: number): Promise<TopReviewedSkillRow[]>
  findUserCreatedAt(userId: string): Promise<UserCreatedAtRow | null>
  lockProfileAggregateRefresh(userId: string, transaction: UserTransaction): Promise<void>
}
