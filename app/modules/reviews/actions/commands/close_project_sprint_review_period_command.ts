import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { recalculateSprintReviewTargetStatsForSprint } from '#modules/reviews/actions/support/reverse_review_target_stats'
import {
  canTransitionProjectSprint,
  type ProjectSprintStatus,
} from '#modules/reviews/domain/sprint_review_rules'

export interface CloseProjectSprintReviewPeriodDTO {
  sprint_id: string
}

export interface CloseProjectSprintReviewPeriodResult {
  sprint_id: string
  status: 'review_closed'
  review_closed_at: DateTime
  closed_package_count: number
}

interface SprintRecord {
  id: string
  project_id: string
  status: string
}

interface ProjectRecord {
  owner_id: string | null
  manager_id: string | null
}

const PROJECT_SPRINT_STATUSES = new Set<ProjectSprintStatus>([
  'draft',
  'active',
  'review_open',
  'review_closed',
  'archived',
])

const MANAGER_PROJECT_ROLES = new Set(['owner', 'project_owner', 'project_manager', 'manager'])

export default class CloseProjectSprintReviewPeriodCommand {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async execute(
    dto: CloseProjectSprintReviewPeriodDTO
  ): Promise<CloseProjectSprintReviewPeriodResult> {
    const actorId = this.requireUserId()
    const trx = await db.transaction()

    try {
      const sprint = (await trx
        .from('project_sprints')
        .where('id', dto.sprint_id)
        .forUpdate()
        .first()) as SprintRecord | undefined

      if (!sprint) {
        throw new NotFoundException('Project sprint not found')
      }

      const project = (await trx
        .from('projects')
        .where('id', sprint.project_id)
        .whereNull('deleted_at')
        .select('owner_id', 'manager_id')
        .first()) as ProjectRecord | undefined

      if (!project) {
        throw new NotFoundException('Project not found')
      }

      const actorRole = await this.findActorProjectRole(sprint.project_id, actorId, trx)
      const actorCanManageSprint =
        actorId === project.owner_id ||
        actorId === project.manager_id ||
        (actorRole !== null && MANAGER_PROJECT_ROLES.has(actorRole))
      const transition = canTransitionProjectSprint({
        from: this.toProjectSprintStatus(sprint.status),
        to: 'review_closed',
        actorCanManageSprint,
      })

      if (!transition.allowed) {
        if (!actorCanManageSprint) {
          throw new ForbiddenException(transition.reason ?? 'Actor cannot manage project sprint')
        }
        throw new BusinessLogicException(transition.reason ?? 'Invalid project sprint transition')
      }

      const counts = await this.countPackages(sprint.id, trx)
      const pendingWorkflowCount = await this.countPendingReverseReviewWorkflows(sprint.id, trx)
      if (pendingWorkflowCount > 0) {
        throw new BusinessLogicException(
          `Cannot close sprint review period with ${pendingWorkflowCount} unfinished reverse review workflows`,
          {
            pending_reverse_review_count: pendingWorkflowCount,
          }
        )
      }

      if (counts.pending > 0) {
        throw new BusinessLogicException(
          `Cannot close sprint review period with ${counts.pending} pending sprint review packages`,
          {
            pending_package_count: counts.pending,
            submitted_package_count: counts.submitted,
          }
        )
      }

      const now = DateTime.utc()
      await trx.from('project_sprints').where('id', sprint.id).update({
        status: 'review_closed',
        review_closed_at: now.toSQL(),
        updated_at: now.toSQL(),
      })
      await recalculateSprintReviewTargetStatsForSprint(sprint.id, trx)

      await trx.commit()

      await auditPublicApi.write(this.execCtx, {
        action: 'close_sprint_review_period',
        entity_type: 'project_sprint',
        entity_id: sprint.id,
        new_values: {
          status: 'review_closed',
          submitted_package_count: counts.submitted,
        },
      })

      return {
        sprint_id: sprint.id,
        status: 'review_closed',
        review_closed_at: now,
        closed_package_count: counts.submitted,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }

    return this.execCtx.userId
  }

  private toProjectSprintStatus(status: string): ProjectSprintStatus {
    if (!PROJECT_SPRINT_STATUSES.has(status as ProjectSprintStatus)) {
      throw new BusinessLogicException(`Unknown project sprint status: ${status}`)
    }

    return status as ProjectSprintStatus
  }

  private async findActorProjectRole(
    projectId: string,
    actorId: string,
    trx: TransactionClientContract
  ): Promise<string | null> {
    const member = (await trx
      .from('project_members')
      .where('project_id', projectId)
      .where('user_id', actorId)
      .select('project_role')
      .first()) as { project_role: string } | undefined

    return member?.project_role ?? null
  }

  private async countPendingReverseReviewWorkflows(
    sprintId: string,
    trx: TransactionClientContract
  ): Promise<number> {
    const row = (await trx
      .from('sprint_reverse_review_workflows')
      .where('sprint_id', sprintId)
      .whereNot('status', 'done')
      .count('* as total')
      .first()) as { total?: string | number } | undefined

    return Number(row?.total ?? 0)
  }

  private async countPackages(
    sprintId: string,
    trx: TransactionClientContract
  ): Promise<{ pending: number; submitted: number }> {
    const rows = (await trx
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
}
