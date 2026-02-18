import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type {
  ReviewSprintLifecyclePersistenceSession,
  ReviewSprintLifecycleProject,
  ReviewSprintLifecycleSprint,
  ReviewSprintLifecycleUnitOfWork,
  ReviewSprintPackageCounts,
} from '#modules/reviews/actions/ports/outbound/review_sprint_lifecycle_unit_of_work'
import { recalculateSprintReviewTargetStatsForSprint } from '#modules/reviews/infra/repositories/reverse_review_target_stats_repository'

class LucidReviewSprintLifecycleSession implements ReviewSprintLifecyclePersistenceSession {
  constructor(private readonly transaction: TransactionClientContract) {}

  async loadSprintForUpdate(sprintId: string): Promise<ReviewSprintLifecycleSprint | null> {
    const sprint = (await this.transaction
      .from('project_sprints')
      .where('id', sprintId)
      .forUpdate()
      .select('id', 'project_id', 'status')
      .first()) as { id: string; project_id: string; status: string } | undefined

    return sprint
      ? {
          id: sprint.id,
          projectId: sprint.project_id,
          status: sprint.status,
        }
      : null
  }

  async loadProject(projectId: string): Promise<ReviewSprintLifecycleProject | null> {
    const project = (await this.transaction
      .from('projects')
      .where('id', projectId)
      .whereNull('deleted_at')
      .select('owner_id', 'manager_id')
      .first()) as { owner_id: string | null; manager_id: string | null } | undefined

    return project
      ? {
          ownerId: project.owner_id,
          managerId: project.manager_id,
        }
      : null
  }

  async findActorProjectRole(projectId: string, actorId: string): Promise<string | null> {
    const member = (await this.transaction
      .from('project_members')
      .where('project_id', projectId)
      .where('user_id', actorId)
      .select('project_role')
      .first()) as { project_role: string } | undefined

    return member?.project_role ?? null
  }

  async countPackages(sprintId: string): Promise<ReviewSprintPackageCounts> {
    const rows = (await this.transaction
      .from('sprint_review_packages')
      .where('sprint_id', sprintId)
      .groupBy('status')
      .select('status')
      .count('* as total')) as { status: string; total: string | number }[]
    const countByStatus = new Map(rows.map((row) => [row.status, Number(row.total)]))

    return {
      pending: countByStatus.get('pending') ?? 0,
      submitted: countByStatus.get('submitted') ?? 0,
    }
  }

  async countPendingReverseReviewWorkflows(sprintId: string): Promise<number> {
    const row = (await this.transaction
      .from('sprint_reverse_review_workflows')
      .where('sprint_id', sprintId)
      .whereNot('status', 'done')
      .count('* as total')
      .first()) as { total?: string | number } | undefined

    return Number(row?.total ?? 0)
  }

  async markReviewClosed(sprintId: string, closedAt: Date): Promise<void> {
    await this.transaction.from('project_sprints').where('id', sprintId).update({
      status: 'review_closed',
      review_closed_at: closedAt,
      updated_at: closedAt,
    })
  }

  async recalculateTargetStats(sprintId: string): Promise<void> {
    await recalculateSprintReviewTargetStatsForSprint(sprintId, this.transaction)
  }

  async expirePendingPackages(sprintId: string): Promise<number> {
    const expiredRows = (await this.transaction
      .from('sprint_review_packages')
      .where('sprint_id', sprintId)
      .where('status', 'pending')
      .update({
        status: 'expired',
        updated_at: db.raw('NOW()'),
      })
      .returning('id')) as { id: string }[]

    return expiredRows.length
  }

  async writeAudit(
    execCtx: Parameters<ReviewSprintLifecyclePersistenceSession['writeAudit']>[0],
    input: Parameters<ReviewSprintLifecyclePersistenceSession['writeAudit']>[1]
  ): Promise<void> {
    await auditPublicApi.write(
      execCtx,
      {
        action: input.action,
        critical: true,
        entity_type: 'project_sprint',
        entity_id: input.entityId,
        new_values: input.newValues,
      },
      this.transaction
    )
  }
}

export default class LucidReviewSprintLifecycleUnitOfWork implements ReviewSprintLifecycleUnitOfWork {
  run<T>(work: (session: ReviewSprintLifecyclePersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction((transaction) => work(new LucidReviewSprintLifecycleSession(transaction)))
  }
}
