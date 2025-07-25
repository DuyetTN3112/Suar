import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DateTime } from 'luxon'

import type { DatabaseId, UserCredibilityData, UserTrustData } from '#types/database'

export interface CompletedAssignmentInfo {
  id: DatabaseId
  task_id: DatabaseId
  assignee_id: DatabaseId
}

export interface ReviewUserAccountInfo {
  id: DatabaseId
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
  id: DatabaseId
  is_active: boolean
}

export interface ReviewTaskAssignmentReader {
  findCompletedAssignment(
    assignmentId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<CompletedAssignmentInfo | null>
}

export interface ReviewOrganizationReader {
  listOrganizationIdsByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<DatabaseId[]>

  hasAnyActivePartnerByIds(
    organizationIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<boolean>
}

export interface ReviewUserReaderWriter {
  findAccountInfo(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ReviewUserAccountInfo | null>

  mergeTrustData(
    userId: DatabaseId,
    trustData: Partial<UserTrustData>,
    trx?: TransactionClientContract
  ): Promise<void>

  updateCredibilityData(
    userId: DatabaseId,
    credibilityData: UserCredibilityData,
    trx?: TransactionClientContract
  ): Promise<void>

  upsertLifetimePerformanceStats(
    userId: DatabaseId,
    payload: LifetimePerformanceStatsPayload,
    trx?: TransactionClientContract
  ): Promise<void>
}

export interface ReviewUserSkillWriter {
  upsertReviewedSkillScore(
    userId: DatabaseId,
    skillId: DatabaseId,
    payload: ReviewedSkillScorePayload,
    trx?: TransactionClientContract
  ): Promise<PersistedSkillScoreResult>

  upsertSpiderChartSkillData(
    userId: DatabaseId,
    skillId: DatabaseId,
    payload: SpiderChartSkillPayload,
    trx?: TransactionClientContract
  ): Promise<void>
}

export interface ReviewSkillReader {
  listSpiderChartSkillIds(trx?: TransactionClientContract): Promise<{ id: DatabaseId }[]>

  findSkillsByIds(
    skillIds: DatabaseId[],
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
