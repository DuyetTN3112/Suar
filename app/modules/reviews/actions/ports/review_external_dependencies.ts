import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DateTime } from 'luxon'

import type { UserCredibilityData, UserTrustData } from '#modules/users/types/user_profile_data'

export interface CompletedAssignmentInfo {
  id: string
  task_id: string
  assignee_id: string
}

export interface ReviewUserAccountInfo {
  id: string
  createdAtMillis: number
}

export interface LifetimePerformanceStatsPayload {
  totalCompletedAssignments: number
  totalHoursWorked: number
  qualityMean: number
  deliveryScore: number
  performanceScore: number
  calculatedAt: DateTime
}

export interface ReviewedSkillScorePayload {
  levelCode: string
  totalReviews: number
  avgScore: number
  avgPercentage: number
  lastReviewedAt: DateTime | null
}

export interface SpiderChartSkillPayload {
  avgPercentage: number
  levelCode: string
}

export interface PersistedSkillScoreResult {
  oldScore: number | null
}

export interface ReviewSkillInfo {
  id: string
  is_active: boolean
}

export interface ReviewTaskAssignmentReader {
  findCompletedAssignment(
    assignmentId: string,
    trx?: TransactionClientContract
  ): Promise<CompletedAssignmentInfo | null>
}

export interface ReviewOrganizationReader {
  listOrganizationIdsByUser(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<string[]>

  hasAnyActivePartnerByIds(
    organizationIds: string[],
    trx?: TransactionClientContract
  ): Promise<boolean>
}

export interface ReviewUserReaderWriter {
  findAccountInfo(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<ReviewUserAccountInfo | null>

  mergeTrustData(
    userId: string,
    trustData: Partial<UserTrustData>,
    trx?: TransactionClientContract
  ): Promise<void>

  updateCredibilityData(
    userId: string,
    credibilityData: UserCredibilityData,
    trx?: TransactionClientContract
  ): Promise<void>

  upsertLifetimePerformanceStats(
    userId: string,
    payload: LifetimePerformanceStatsPayload,
    trx?: TransactionClientContract
  ): Promise<void>
}

export interface ReviewUserSkillWriter {
  upsertReviewedSkillScore(
    userId: string,
    skillId: string,
    payload: ReviewedSkillScorePayload,
    trx?: TransactionClientContract
  ): Promise<PersistedSkillScoreResult>

  upsertSpiderChartSkillData(
    userId: string,
    skillId: string,
    payload: SpiderChartSkillPayload,
    trx?: TransactionClientContract
  ): Promise<void>
}

export interface ReviewSkillReader {
  listSpiderChartSkillIds(trx?: TransactionClientContract): Promise<{ id: string }[]>

  findSkillsByIds(
    skillIds: string[],
    trx?: TransactionClientContract
  ): Promise<ReviewSkillInfo[]>
}

export interface ReviewExternalDependencies {
  taskAssignment: ReviewTaskAssignmentReader
  organization: ReviewOrganizationReader
  user: ReviewUserReaderWriter
  userSkill: ReviewUserSkillWriter
  skill: ReviewSkillReader
}
