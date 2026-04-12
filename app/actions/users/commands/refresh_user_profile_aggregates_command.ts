import BuildUserWorkHistoryCommand from './build_user_work_history_command.js'
import UpsertUserDomainExpertiseCommand from './upsert_user_domain_expertise_command.js'
import UpsertUserPerformanceStatsCommand from './upsert_user_performance_stats_command.js'

import { BaseCommand } from '#actions/shared/base_command'
import type { DatabaseId } from '#types/database'


export interface RefreshUserProfileAggregatesDTO {
  userId: DatabaseId
  fullRebuild?: boolean
  periodStart?: string | null
  periodEnd?: string | null
}

export interface RefreshUserProfileAggregatesResult {
  userId: DatabaseId
  workHistory: {
    totalCompletedAssignments: number
    inserted: number
    updated: number
  }
  performance: {
    statsId: DatabaseId
    totalTasksCompleted: number
    performanceScore: number | null
  }
  domainExpertise: {
    expertiseId: DatabaseId
    topSkillsCount: number
  }
}

export default class RefreshUserProfileAggregatesCommand extends BaseCommand<
  RefreshUserProfileAggregatesDTO,
  RefreshUserProfileAggregatesResult
> {
  async handle(dto: RefreshUserProfileAggregatesDTO): Promise<RefreshUserProfileAggregatesResult> {
    const workHistoryResult = await new BuildUserWorkHistoryCommand(this.execCtx).handle({
      userId: dto.userId,
      fullRebuild: dto.fullRebuild ?? false,
    })

    const performanceResult = await new UpsertUserPerformanceStatsCommand(this.execCtx).handle({
      userId: dto.userId,
      periodStart: dto.periodStart ?? null,
      periodEnd: dto.periodEnd ?? null,
    })

    const domainExpertiseResult = await new UpsertUserDomainExpertiseCommand(this.execCtx).handle({
      userId: dto.userId,
    })

    await this.logAudit('refresh_user_profile_aggregates', 'user', dto.userId, null, {
      full_rebuild: dto.fullRebuild ?? false,
      work_history_total: workHistoryResult.totalCompletedAssignments,
      performance_score: performanceResult.performanceScore,
      top_skills_count: domainExpertiseResult.topSkillsCount,
    })

    return {
      userId: dto.userId,
      workHistory: {
        totalCompletedAssignments: workHistoryResult.totalCompletedAssignments,
        inserted: workHistoryResult.inserted,
        updated: workHistoryResult.updated,
      },
      performance: {
        statsId: performanceResult.statsId,
        totalTasksCompleted: performanceResult.totalTasksCompleted,
        performanceScore: performanceResult.performanceScore,
      },
      domainExpertise: {
        expertiseId: domainExpertiseResult.expertiseId,
        topSkillsCount: domainExpertiseResult.topSkillsCount,
      },
    }
  }
}
