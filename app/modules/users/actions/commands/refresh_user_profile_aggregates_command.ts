import BuildUserWorkHistoryCommand from './build_user_work_history_command.js'
import UpsertUserDomainExpertiseCommand from './upsert_user_domain_expertise_command.js'
import UpsertUserPerformanceStatsCommand from './upsert_user_performance_stats_command.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { TransactionalAuditWrite } from '#modules/users/actions/dtos/transactional_audit'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserCompletedAssignmentFactReader } from '#modules/users/actions/ports/outbound/user_completed_assignment_fact_reader'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserProfileReviewFactReader } from '#modules/users/actions/ports/outbound/user_profile_review_fact_reader'
import type { UserSelfAssessmentAccuracyFactReader } from '#modules/users/actions/ports/outbound/user_self_assessment_accuracy_fact_reader'
import type {
  UserTransaction,
  UserTransactionRunner,
} from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export interface RefreshUserProfileAggregatesDTO {
  userId: string
  fullRebuild?: boolean
  periodStart?: string | null
  periodEnd?: string | null
}

export interface RefreshUserProfileAggregatesResult {
  userId: string
  workHistory: {
    totalCompletedAssignments: number
    inserted: number
    updated: number
  }
  performance: {
    statsId: string
    totalTasksCompleted: number
    performanceScore: number | null
  }
  domainExpertise: {
    expertiseId: string
    topSkillsCount: number
  }
}

export interface RefreshUserProfileAggregatesTransactionOptions {
  signal?: AbortSignal
  deferAuditWrite?: (write: TransactionalAuditWrite) => void
}

export default class RefreshUserProfileAggregatesCommand extends BaseCommand<
  RefreshUserProfileAggregatesDTO,
  RefreshUserProfileAggregatesResult
> {
  constructor(
    execCtx: UserActionContext,
    private readonly transactions: UserTransactionRunner,
    private readonly users: UserAccountRepository,
    private readonly profiles: UserProfileRepository,
    private readonly completedAssignmentFactReader: UserCompletedAssignmentFactReader,
    private readonly profileReviewFactReader: UserProfileReviewFactReader,
    private readonly selfAssessmentAccuracyFactReader: UserSelfAssessmentAccuracyFactReader
  ) {
    super(execCtx, transactions)
  }

  async handle(dto: RefreshUserProfileAggregatesDTO): Promise<RefreshUserProfileAggregatesResult> {
    return await this.executeInTransaction((trx) => this.handleInTransaction(dto, trx))
  }

  async handleInTransaction(
    dto: RefreshUserProfileAggregatesDTO,
    trx: UserTransaction,
    options: RefreshUserProfileAggregatesTransactionOptions = {}
  ): Promise<RefreshUserProfileAggregatesResult> {
    options.signal?.throwIfAborted()
    await this.profiles.lockProfileAggregateRefresh(dto.userId, trx)
    options.signal?.throwIfAborted()
    const deferredAuditWrites: TransactionalAuditWrite[] = []
    const auditOptions = {
      deferAuditWrite: (write: TransactionalAuditWrite) => {
        deferredAuditWrites.push(write)
      },
    }

    const workHistoryResult = await new BuildUserWorkHistoryCommand(
      this.execCtx,
      this.transactions,
      this.profiles,
      this.completedAssignmentFactReader,
      this.profileReviewFactReader
    ).handleInTransaction(
      {
        userId: dto.userId,
        fullRebuild: dto.fullRebuild ?? false,
      },
      trx,
      auditOptions
    )
    options.signal?.throwIfAborted()

    const performanceResult = await new UpsertUserPerformanceStatsCommand(
      this.execCtx,
      this.transactions,
      this.users,
      this.profiles,
      this.selfAssessmentAccuracyFactReader
    ).handleInTransaction(
      {
        userId: dto.userId,
        periodStart: dto.periodStart ?? null,
        periodEnd: dto.periodEnd ?? null,
      },
      trx,
      auditOptions
    )
    options.signal?.throwIfAborted()

    const domainExpertiseResult = await new UpsertUserDomainExpertiseCommand(
      this.execCtx,
      this.transactions,
      this.profiles
    ).handleInTransaction(
      {
        userId: dto.userId,
      },
      trx,
      auditOptions
    )
    options.signal?.throwIfAborted()

    if (this.execCtx.userId) {
      const actorId = this.execCtx.userId
      deferredAuditWrites.push(() =>
        auditPublicApi.write(
          this.execCtx,
          {
            user_id: actorId,
            action: 'refresh_user_profile_aggregates',
            critical: true,
            entity_type: 'user',
            entity_id: dto.userId,
            old_values: null,
            new_values: {
              full_rebuild: dto.fullRebuild ?? false,
              work_history_total: workHistoryResult.totalCompletedAssignments,
              performance_score: performanceResult.performanceScore,
              top_skills_count: domainExpertiseResult.topSkillsCount,
            },
          },
          trx
        )
      )
    }

    for (const writeAudit of deferredAuditWrites) {
      options.signal?.throwIfAborted()
      if (options.deferAuditWrite) {
        options.deferAuditWrite(writeAudit)
      } else {
        await writeAudit()
      }
    }

    options.signal?.throwIfAborted()
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
