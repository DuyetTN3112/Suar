import { randomBytes } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import RefreshUserProfileAggregatesCommand from './refresh_user_profile_aggregates_command.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { BaseCommand } from '#actions/users/base_command'
import {
  buildProfileSnapshotSlug,
  pickTopFrequencyKeys,
} from '#domain/users/profile_snapshot_rules'
import CacheService from '#infra/cache/cache_service'
import * as userModelQueries from '#infra/users/repositories/read/model_queries'
import * as domainExpertiseQueries from '#infra/users/repositories/read/user_domain_expertise_queries'
import * as performanceStatQueries from '#infra/users/repositories/read/user_performance_stat_queries'
import * as profileSnapshotQueries from '#infra/users/repositories/read/user_profile_snapshot_queries'
import * as userSkillQueries from '#infra/users/repositories/read/user_skill_queries'
import * as workHistoryQueries from '#infra/users/repositories/read/user_work_history_queries'
import * as profileSnapshotMutations from '#infra/users/repositories/write/user_profile_snapshot_mutations'
import type { DatabaseId } from '#types/database'
import type {
  UserDomainExpertiseRecord,
  UserPerformanceStatRecord,
  UserProfileSnapshotRecord,
  UserRecord,
  UserSkillRecord,
  UserWorkHistoryRecord,
} from '#types/user_records'

export interface PublishUserProfileSnapshotDTO {
  snapshotName?: string
  isPublic?: boolean
  expiresInDays?: number | null
}

export interface PublishUserProfileSnapshotResult {
  snapshotId: DatabaseId
  version: number
  shareableSlug: string | null
  shareableToken: string | null
  isPublic: boolean
}

interface LoadedSnapshotReadModel {
  user: UserRecord
  skills: UserSkillRecord[]
  performanceStatsRow: UserPerformanceStatRecord | null
  domainExpertiseRow: UserDomainExpertiseRecord | null
  latestHighlights: UserWorkHistoryRecord[]
}

interface LoadedSnapshotInputs {
  lastSnapshot: UserProfileSnapshotRecord | null
  readModel: LoadedSnapshotReadModel
}

interface BuiltSnapshotContent {
  nextVersion: number
  isPublic: boolean
  shareableSlug: string | null
  shareableToken: string | null
  summary: SnapshotSummary
  performanceMetrics: SnapshotPerformanceMetrics
  trustMetrics: SnapshotTrustMetrics
  verifiedSkills: SnapshotVerifiedSkill[]
  workHighlights: SnapshotWorkHighlight[]
}

interface PersistedUserProfileSnapshot {
  snapshot: UserProfileSnapshotRecord
  content: BuiltSnapshotContent
}

interface SnapshotSummary extends Record<string, unknown> {
  user_id: DatabaseId
  username: string
  total_verified_skills: number
  total_tasks_completed: number
  trust_score: number
  trust_tier: string | null
  performance_score: number
  generated_at: string | null
}

interface SnapshotPerformanceMetrics extends Record<string, unknown> {
  period_start: string | null
  period_end: string | null
  total_tasks_completed: number
  total_hours_worked: number
  avg_quality_score: number | null
  on_time_delivery_rate: number | null
  avg_days_early_or_late: number | null
  performance_score: number | null
  tasks_by_type: Record<string, number>
  tasks_by_domain: Record<string, number>
  tasks_by_difficulty: Record<string, number>
  tasks_as_lead: number
  tasks_as_sole_contributor: number
  tasks_mentoring_others: number
  longest_on_time_streak: number
  current_on_time_streak: number
  self_assessment_accuracy: number | null
  trust_data: unknown
}

interface SnapshotDomainExpertiseSummary extends Record<string, unknown> {
  tech_stack_frequency: Record<string, number>
  domain_frequency: Record<string, number>
  problem_category_frequency: Record<string, number>
  top_skills: Record<string, unknown>[]
}

interface SnapshotTrustMetrics extends Record<string, unknown> {
  trust_data: unknown
  domain_expertise: SnapshotDomainExpertiseSummary
  tech_stack: string[]
}

interface SnapshotVerifiedSkill extends Record<string, unknown> {
  skill_id: DatabaseId
  skill_name: string
  level_code: string
  total_reviews: number
  avg_percentage: number | null
  avg_score: number | null
  last_reviewed_at: string | null
}

interface SnapshotWorkHighlight extends Record<string, unknown> {
  task_assignment_id: DatabaseId
  task_id: DatabaseId
  task_title: string
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  collaboration_type: string | null
  difficulty: string | null
  overall_quality_score: number | null
  was_on_time: boolean | null
  completed_at: string | null
}

type VerifiedSkillSource = UserSkillRecord & {
  skill: {
    skill_name: string
    category_code: string
  }
}

export default class PublishUserProfileSnapshotCommand extends BaseCommand<
  PublishUserProfileSnapshotDTO,
  PublishUserProfileSnapshotResult
> {
  async handle(dto: PublishUserProfileSnapshotDTO): Promise<PublishUserProfileSnapshotResult> {
    const userId = this.getCurrentUserId()
    await this.refreshAggregates(userId)
    const readModel = await this.loadSnapshotReadModel(userId)

    return await this.executeInTransaction(async (trx) => {
      const inputs: LoadedSnapshotInputs = {
        lastSnapshot: await this.loadLastSnapshot(userId, trx),
        readModel,
      }
      const content = this.buildSnapshotContent(userId, dto, inputs)
      const persisted = await this.persistSnapshot(userId, dto, readModel.user, content, trx)
      this.registerPostCommitCacheInvalidation(trx, userId, persisted.content.shareableSlug)
      return this.toResult(persisted)
    })
  }

  private async refreshAggregates(userId: DatabaseId): Promise<void> {
    await new RefreshUserProfileAggregatesCommand(this.execCtx).handle({
      userId,
      fullRebuild: false,
    })
  }

  private async loadSnapshotReadModel(userId: DatabaseId): Promise<LoadedSnapshotReadModel> {
    const user = await userModelQueries.findNotDeletedOrFailRecord(userId)
    const skills = await userSkillQueries.listByUserWithSkill(userId)
    const performanceStatsRow = await performanceStatQueries.findLatestLifetimeByUser(userId)
    const domainExpertiseRow = await domainExpertiseQueries.findByUser(userId)
    const latestHighlights = await workHistoryQueries.listRecentByUser(userId, 6)

    return {
      user,
      skills,
      performanceStatsRow,
      domainExpertiseRow,
      latestHighlights,
    }
  }

  private async loadLastSnapshot(
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<UserProfileSnapshotRecord | null> {
    return profileSnapshotQueries.findLatestByUser(userId, trx)
  }

  private buildSnapshotContent(
    userId: DatabaseId,
    dto: PublishUserProfileSnapshotDTO,
    inputs: LoadedSnapshotInputs
  ): BuiltSnapshotContent {
    const nextVersion = (inputs.lastSnapshot?.version ?? 0) + 1
    const verifiedSkills = this.buildVerifiedSkills(inputs.readModel.skills)
    const performanceMetrics = this.buildPerformanceMetrics(
      inputs.readModel.user,
      inputs.readModel.performanceStatsRow
    )
    const domainExpertiseSummary = this.buildDomainExpertiseSummary(
      inputs.readModel.domainExpertiseRow
    )
    const workHighlights = this.buildWorkHighlights(inputs.readModel.latestHighlights)
    const isPublic = dto.isPublic ?? true

    return {
      nextVersion,
      isPublic,
      shareableSlug: isPublic
        ? buildProfileSnapshotSlug({
            username: inputs.readModel.user.username,
            userId,
            version: nextVersion,
            suffix: Date.now().toString(36),
          })
        : null,
      shareableToken: isPublic ? randomBytes(16).toString('hex') : null,
      summary: this.buildSummary(
        userId,
        inputs.readModel.user,
        verifiedSkills.length,
        inputs,
        workHighlights
      ),
      performanceMetrics,
      trustMetrics: this.buildTrustMetrics(inputs.readModel.user, domainExpertiseSummary),
      verifiedSkills,
      workHighlights,
    }
  }

  private buildVerifiedSkills(skills: LoadedSnapshotReadModel['skills']): SnapshotVerifiedSkill[] {
    return skills
      .filter((skill): skill is VerifiedSkillSource => skill.total_reviews > 0 && !!skill.skill)
      .map((skill) => ({
        skill_id: skill.skill_id,
        skill_name: skill.skill.skill_name,
        level_code: skill.level_code,
        total_reviews: skill.total_reviews,
        avg_percentage: skill.avg_percentage,
        avg_score: skill.avg_score,
        last_reviewed_at: skill.last_reviewed_at?.toISO() ?? null,
      }))
  }

  private buildSummary(
    userId: DatabaseId,
    user: UserRecord,
    totalVerifiedSkills: number,
    inputs: LoadedSnapshotInputs,
    workHighlights: SnapshotWorkHighlight[]
  ): SnapshotSummary {
    return {
      user_id: userId,
      username: user.username,
      total_verified_skills: totalVerifiedSkills,
      total_tasks_completed:
        inputs.readModel.performanceStatsRow?.total_tasks_completed ?? workHighlights.length,
      trust_score: user.trust_data?.calculated_score ?? 0,
      trust_tier: user.trust_data?.current_tier_code ?? null,
      performance_score:
        inputs.readModel.performanceStatsRow?.performance_score ??
        user.trust_data?.performance_score ??
        0,
      generated_at: DateTime.now().toISO(),
    }
  }

  private buildPerformanceMetrics(
    user: UserRecord,
    performanceStatsRow: LoadedSnapshotReadModel['performanceStatsRow']
  ): SnapshotPerformanceMetrics {
    return {
      period_start: performanceStatsRow?.period_start?.toISO() ?? null,
      period_end: performanceStatsRow?.period_end?.toISO() ?? null,
      total_tasks_completed: performanceStatsRow?.total_tasks_completed ?? 0,
      total_hours_worked: performanceStatsRow?.total_hours_worked ?? 0,
      avg_quality_score: performanceStatsRow?.avg_quality_score ?? null,
      on_time_delivery_rate: performanceStatsRow?.on_time_delivery_rate ?? null,
      avg_days_early_or_late: performanceStatsRow?.avg_days_early_or_late ?? null,
      performance_score:
        performanceStatsRow?.performance_score ?? user.trust_data?.performance_score ?? null,
      tasks_by_type: performanceStatsRow?.tasks_by_type ?? {},
      tasks_by_domain: performanceStatsRow?.tasks_by_domain ?? {},
      tasks_by_difficulty: performanceStatsRow?.tasks_by_difficulty ?? {},
      tasks_as_lead: performanceStatsRow?.tasks_as_lead ?? 0,
      tasks_as_sole_contributor: performanceStatsRow?.tasks_as_sole_contributor ?? 0,
      tasks_mentoring_others: performanceStatsRow?.tasks_mentoring_others ?? 0,
      longest_on_time_streak: performanceStatsRow?.longest_on_time_streak ?? 0,
      current_on_time_streak: performanceStatsRow?.current_on_time_streak ?? 0,
      self_assessment_accuracy: performanceStatsRow?.self_assessment_accuracy ?? null,
      trust_data: user.trust_data ?? null,
    }
  }

  private buildDomainExpertiseSummary(
    domainExpertiseRow: LoadedSnapshotReadModel['domainExpertiseRow']
  ): SnapshotDomainExpertiseSummary {
    return {
      tech_stack_frequency: domainExpertiseRow?.tech_stack_frequency ?? {},
      domain_frequency: domainExpertiseRow?.domain_frequency ?? {},
      problem_category_frequency: domainExpertiseRow?.problem_category_frequency ?? {},
      top_skills: domainExpertiseRow?.top_skills ?? [],
    }
  }

  private buildTrustMetrics(
    user: UserRecord,
    domainExpertiseSummary: SnapshotDomainExpertiseSummary
  ): SnapshotTrustMetrics {
    return {
      trust_data: user.trust_data ?? null,
      domain_expertise: domainExpertiseSummary,
      tech_stack: pickTopFrequencyKeys(domainExpertiseSummary.tech_stack_frequency, 10),
    }
  }

  private buildWorkHighlights(
    latestHighlights: LoadedSnapshotReadModel['latestHighlights']
  ): SnapshotWorkHighlight[] {
    return latestHighlights.map((item) => ({
      task_assignment_id: item.task_assignment_id,
      task_id: item.task_id,
      task_title: item.task_title,
      task_type: item.task_type,
      business_domain: item.business_domain,
      problem_category: item.problem_category,
      role_in_task: item.role_in_task,
      collaboration_type: item.collaboration_type,
      difficulty: item.difficulty,
      overall_quality_score: item.overall_quality_score,
      was_on_time: item.was_on_time,
      completed_at: item.completed_at?.toISO() ?? null,
    }))
  }

  private async persistSnapshot(
    userId: DatabaseId,
    dto: PublishUserProfileSnapshotDTO,
    user: UserRecord,
    content: BuiltSnapshotContent,
    trx: TransactionClientContract
  ): Promise<PersistedUserProfileSnapshot> {
    await profileSnapshotMutations.unsetCurrentByUser(userId, trx)

    const snapshot = await profileSnapshotMutations.create(
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
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'publish_profile_snapshot',
        entity_type: 'user_profile_snapshot',
        entity_id: snapshot.id,
        old_values: null,
        new_values: {
          snapshot_id: snapshot.id,
          version: content.nextVersion,
          is_public: content.isPublic,
          shareable_slug: content.shareableSlug,
        },
      })
    }

    return {
      snapshot,
      content,
    }
  }

  private registerPostCommitCacheInvalidation(
    trx: TransactionClientContract,
    userId: DatabaseId,
    shareableSlug: string | null
  ): void {
    void trx.on('commit', () => {
      void CacheService.deleteByPattern(`*profile:snapshot:current*${userId}*`)
      void CacheService.deleteByPattern(`*profile:snapshot:history*${userId}*`)

      if (shareableSlug) {
        void CacheService.deleteByPattern(`*profile:snapshot:public*${shareableSlug}*`)
      }
    })
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
