import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import UserRepository from '#infra/users/repositories/user_repository'
import UserSkillRepository from '#infra/users/repositories/user_skill_repository'
import UserProfileSnapshotRepository from '#infra/users/repositories/user_profile_snapshot_repository'
import UserWorkHistoryRepository from '#infra/users/repositories/user_work_history_repository'
import UserPerformanceStatRepository from '#infra/users/repositories/user_performance_stat_repository'
import UserDomainExpertiseRepository from '#infra/users/repositories/user_domain_expertise_repository'
import RefreshUserProfileAggregatesCommand from './refresh_user_profile_aggregates_command.js'
import type { DatabaseId } from '#types/database'
import CacheService from '#services/cache_service'
import {
  buildProfileSnapshotSlug,
  pickTopFrequencyKeys,
} from '#domain/users/profile_snapshot_rules'

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

export default class PublishUserProfileSnapshotCommand extends BaseCommand<
  PublishUserProfileSnapshotDTO,
  PublishUserProfileSnapshotResult
> {
  async handle(dto: PublishUserProfileSnapshotDTO): Promise<PublishUserProfileSnapshotResult> {
    const userId = this.getCurrentUserId()

    // Ensure aggregate tables are up-to-date before publishing a shareable snapshot.
    await new RefreshUserProfileAggregatesCommand(this.execCtx).handle({
      userId,
      fullRebuild: false,
    })

    return await this.executeInTransaction(async (trx) => {
      const user = await UserRepository.findNotDeletedOrFail(userId, trx)

      const [lastSnapshot, skills, performanceStatsRow, domainExpertiseRow, latestHighlights] =
        await Promise.all([
          UserProfileSnapshotRepository.findLatestByUser(userId, trx),
          UserSkillRepository.listByUserWithSkill(userId, trx),
          UserPerformanceStatRepository.findLatestLifetimeByUser(userId, trx),
          UserDomainExpertiseRepository.findByUser(userId, trx),
          UserWorkHistoryRepository.listRecentByUser(userId, 6, trx),
        ])

      const nextVersion = (lastSnapshot?.version ?? 0) + 1

      const verifiedSkills = skills
        .filter((skill) => skill.total_reviews > 0)
        .map((skill) => ({
          skill_id: skill.skill_id,
          skill_name: skill.skill.skill_name,
          level_code: skill.level_code,
          total_reviews: skill.total_reviews,
          avg_percentage: skill.avg_percentage,
          avg_score: skill.avg_score,
          last_reviewed_at: skill.last_reviewed_at?.toISO() ?? null,
        }))

      const summary = {
        user_id: userId,
        username: user.username,
        total_verified_skills: verifiedSkills.length,
        total_tasks_completed:
          performanceStatsRow?.total_tasks_completed ?? latestHighlights.length,
        trust_score: user.trust_data?.calculated_score ?? 0,
        trust_tier: user.trust_data?.current_tier_code ?? null,
        performance_score:
          performanceStatsRow?.performance_score ?? user.trust_data?.performance_score ?? 0,
        generated_at: DateTime.now().toISO(),
      }

      const performanceMetrics = {
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

      const domainExpertiseSummary = {
        tech_stack_frequency: domainExpertiseRow?.tech_stack_frequency ?? {},
        domain_frequency: domainExpertiseRow?.domain_frequency ?? {},
        problem_category_frequency: domainExpertiseRow?.problem_category_frequency ?? {},
        top_skills: domainExpertiseRow?.top_skills ?? [],
      }

      const techStack = pickTopFrequencyKeys(domainExpertiseSummary.tech_stack_frequency, 10)

      const workHighlights = latestHighlights.map((item) => ({
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

      const isPublic = dto.isPublic ?? true
      const shareableSlug = isPublic
        ? buildProfileSnapshotSlug({
            username: user.username,
            userId: user.id,
            version: nextVersion,
            suffix: Date.now().toString(36),
          })
        : null
      const shareableToken = isPublic ? randomBytes(16).toString('hex') : null
      const trustMetrics = {
        trust_data: user.trust_data ?? null,
        domain_expertise: domainExpertiseSummary,
        tech_stack: techStack,
      }

      await UserProfileSnapshotRepository.unsetCurrentByUser(userId, trx)

      const snapshot = await UserProfileSnapshotRepository.create(
        {
          user_id: userId,
          version: nextVersion,
          snapshot_name: dto.snapshotName?.trim() || null,
          is_current: true,
          is_public: isPublic,
          shareable_slug: shareableSlug,
          shareable_token: shareableToken,
          summary,
          skills_verified: verifiedSkills,
          work_highlights: workHighlights,
          performance_metrics: performanceMetrics,
          trust_metrics: trustMetrics,
          scoring_version: user.trust_data?.scoring_version ?? 'v1',
        },
        trx
      )

      await this.logAudit('publish_profile_snapshot', 'user_profile_snapshot', snapshot.id, null, {
        snapshot_id: snapshot.id,
        version: nextVersion,
        is_public: isPublic,
        shareable_slug: shareableSlug,
      })

      void trx.on('commit', () => {
        void CacheService.deleteByPattern(`*profile:snapshot:current*${userId}*`)
        void CacheService.deleteByPattern(`*profile:snapshot:history*${userId}*`)

        if (shareableSlug) {
          void CacheService.deleteByPattern(`*profile:snapshot:public*${shareableSlug}*`)
        }
      })

      return {
        snapshotId: snapshot.id,
        version: nextVersion,
        shareableSlug,
        shareableToken,
        isPublic,
      }
    })
  }
}
