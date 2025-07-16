import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import SkillRepository from '#infra/skills/repositories/skill_repository'
import TaskAssignmentRepository from '#infra/tasks/repositories/task_assignment_repository'
import UserPerformanceStatRepository from '#infra/users/repositories/user_performance_stat_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import UserSkillRepository from '#infra/users/repositories/user_skill_repository'
import type { DatabaseId, UserCredibilityData, UserTrustData } from '#types/database'

import type {
  CompletedAssignmentInfo,
  LifetimePerformanceStatsPayload,
  PersistedSkillScoreResult,
  ReviewSkillInfo,
  ReviewSkillReader,
  ReviewedSkillScorePayload,
  ReviewExternalDependencies,
  ReviewOrganizationReader,
  ReviewTaskAssignmentReader,
  ReviewUserAccountInfo,
  ReviewUserReaderWriter,
  ReviewUserSkillWriter,
  SpiderChartSkillPayload,
} from './review_external_dependencies.js'

export class InfraReviewTaskAssignmentReader implements ReviewTaskAssignmentReader {
  async findCompletedAssignment(
    assignmentId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<CompletedAssignmentInfo | null> {
    const assignment = await TaskAssignmentRepository.findCompletedById(assignmentId, trx)
    if (!assignment) {
      return null
    }

    return {
      id: assignment.id,
      task_id: assignment.task_id,
      assignee_id: assignment.assignee_id,
    }
  }
}

export class InfraReviewOrganizationReader implements ReviewOrganizationReader {
  async listOrganizationIdsByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<DatabaseId[]> {
    const memberships = await OrganizationUserRepository.listMembershipsByUser(userId, trx)
    return memberships.map((membership) => membership.organization_id)
  }

  async hasAnyActivePartnerByIds(
    organizationIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return OrganizationRepository.hasAnyActivePartnerByIds(organizationIds, trx)
  }
}

export class InfraReviewUserReaderWriter implements ReviewUserReaderWriter {
  async findAccountInfo(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ReviewUserAccountInfo | null> {
    const user = await UserRepository.findById(userId, trx)
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
    const user = await UserRepository.findNotDeletedOrFail(userId, trx)
    user.trust_data = {
      ...(user.trust_data ?? {
        current_tier_code: null,
        calculated_score: 0,
        raw_score: 0,
        total_verified_reviews: 0,
        last_calculated_at: null,
      }),
      ...trustData,
    }
    await UserRepository.save(user, trx)
  }

  async updateCredibilityData(
    userId: DatabaseId,
    credibilityData: UserCredibilityData,
    trx?: TransactionClientContract
  ): Promise<void> {
    const user = await UserRepository.findNotDeletedOrFail(userId, trx)
    user.credibility_data = credibilityData
    await UserRepository.save(user, trx)
  }

  async upsertLifetimePerformanceStats(
    userId: DatabaseId,
    payload: LifetimePerformanceStatsPayload,
    trx?: TransactionClientContract
  ): Promise<void> {
    const latestStats = await UserPerformanceStatRepository.findLatestLifetimeByUser(userId, trx)
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
      await UserPerformanceStatRepository.save(latestStats, trx)
      return
    }

    await UserPerformanceStatRepository.create(data, trx)
  }
}

export class InfraReviewUserSkillWriter implements ReviewUserSkillWriter {
  async upsertReviewedSkillScore(
    userId: DatabaseId,
    skillId: DatabaseId,
    payload: ReviewedSkillScorePayload,
    trx?: TransactionClientContract
  ): Promise<PersistedSkillScoreResult> {
    const existing = await UserSkillRepository.findByUserAndSkill(userId, skillId, trx)
    const oldScore = existing?.avg_percentage ?? null

    if (existing) {
      existing.level_code = payload.levelCode
      existing.total_reviews = payload.totalReviews
      existing.avg_score = payload.avgScore
      existing.avg_percentage = payload.avgPercentage
      existing.last_calculated_at = DateTime.now()
      existing.last_reviewed_at = payload.lastReviewedAt
      existing.source = 'reviewed'
      await UserSkillRepository.save(existing, trx)
      return { oldScore }
    }

    await UserSkillRepository.create(
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
    payload: SpiderChartSkillPayload,
    trx?: TransactionClientContract
  ): Promise<void> {
    const existing = await UserSkillRepository.findByUserAndSkill(userId, skillId, trx)

    if (existing) {
      existing.avg_percentage = payload.avgPercentage
      existing.level_code = payload.levelCode
      existing.last_calculated_at = DateTime.now()
      await UserSkillRepository.save(existing, trx)
      return
    }

    await UserSkillRepository.create(
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

export class InfraReviewSkillReader implements ReviewSkillReader {
  async listSpiderChartSkillIds(
    trx?: TransactionClientContract
  ): Promise<{ id: DatabaseId }[]> {
    return SkillRepository.getSpiderChartSkillIds(trx)
  }

  async findSkillsByIds(
    skillIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<ReviewSkillInfo[]> {
    const skills = await SkillRepository.findByIds(skillIds, trx)

    return skills.map((skill) => ({
      id: skill.id,
      is_active: skill.is_active,
    }))
  }
}

export const DefaultReviewDependencies: ReviewExternalDependencies = {
  taskAssignment: new InfraReviewTaskAssignmentReader(),
  organization: new InfraReviewOrganizationReader(),
  user: new InfraReviewUserReaderWriter(),
  userSkill: new InfraReviewUserSkillWriter(),
  skill: new InfraReviewSkillReader(),
}
