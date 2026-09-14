import { DateTime } from 'luxon'

import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'
import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/profile-skills/user_skill_catalog'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserTransaction } from '#modules/users/actions/ports/outbound/user_transaction'

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
  confidence: number | null
  evidenceCount: number
  lastReviewedAt: DateTime | null
}

export interface UserSpiderChartSkillPayload {
  avgPercentage: number
  levelCode: string
}

export const toStoredConfidenceValue = (value: number | null): number | null => {
  if (value === null || !Number.isFinite(value)) {
    return null
  }

  return Math.round((Math.max(0, Math.min(100, value)) / 100) * 10000) / 10000
}

export class ComposedUserProfileStatsAdapter {
  constructor(
    private readonly profiles: UserProfileRepository,
    private readonly skillCatalog: UserSkillCatalog
  ) {}

  async upsertLifetimePerformanceStats(
    userId: string,
    payload: UserLifetimePerformanceStatsPayload,
    trx?: UserTransaction
  ): Promise<void> {
    const latestStats = await this.profiles.findLatestLifetimePerformanceStat(userId, trx)
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
      await this.profiles.updatePerformanceStat(latestStats.id, data, trx)
      return
    }

    await this.profiles.createPerformanceStat(data, trx)
  }

  async upsertReviewedSkillScore(
    userId: string,
    skillId: string,
    payload: UserReviewedSkillScorePayload,
    trx?: UserTransaction
  ): Promise<{ oldScore: number | null }> {
    const existing = await this.profiles.findUserSkill(userId, skillId, trx)
    const oldScore = existing?.avg_percentage ?? null

    const proficiencyLevelId = await this.skillCatalog.resolveProficiencyLevelId(
      payload.levelCode,
      trx
    )
    const persistedLevelCode = getCanonicalProficiencyLevelValue(payload.levelCode)
    const storedConfidence = toStoredConfidenceValue(payload.confidence)

    if (existing) {
      await this.profiles.updateUserSkill(
        existing.id,
        {
          verified_public_proficiency_code: persistedLevelCode,
          proficiency_level_id: proficiencyLevelId,
          total_reviews: payload.totalReviews,
          avg_score: payload.avgScore,
          avg_percentage: payload.avgPercentage,
          confidence: storedConfidence,
          evidence_count: payload.evidenceCount,
          last_calculated_at: DateTime.now(),
          last_reviewed_at: payload.lastReviewedAt,
          source: 'reviewed',
        },
        trx
      )
      return { oldScore }
    }

    await this.profiles.createUserSkill(
      {
        user_id: userId,
        skill_id: skillId,
        verified_public_proficiency_code: persistedLevelCode,
        proficiency_level_id: proficiencyLevelId,
        total_reviews: payload.totalReviews,
        avg_score: payload.avgScore,
        avg_percentage: payload.avgPercentage,
        confidence: storedConfidence,
        evidence_count: payload.evidenceCount,
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
    trx?: UserTransaction
  ): Promise<void> {
    const existing = await this.profiles.findUserSkill(userId, skillId, trx)

    const proficiencyLevelId = await this.skillCatalog.resolveProficiencyLevelId(
      payload.levelCode,
      trx
    )
    const persistedLevelCode = getCanonicalProficiencyLevelValue(payload.levelCode)

    if (existing) {
      await this.profiles.updateUserSkill(
        existing.id,
        {
          avg_percentage: payload.avgPercentage,
          verified_public_proficiency_code: persistedLevelCode,
          proficiency_level_id: proficiencyLevelId,
          last_calculated_at: DateTime.now(),
        },
        trx
      )
      return
    }

    await this.profiles.createUserSkill(
      {
        user_id: userId,
        skill_id: skillId,
        verified_public_proficiency_code: persistedLevelCode,
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
