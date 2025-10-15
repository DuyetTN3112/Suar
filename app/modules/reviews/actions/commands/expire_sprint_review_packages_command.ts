import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ExpireSprintReviewPackagesDTO {
  sprint_id: string
  reason?: string | null
}

export interface ExpireSprintReviewPackagesResult {
  sprint_id: string
  expired_package_count: number
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

const MANAGER_PROJECT_ROLES = new Set([
  'owner',
  'project_owner',
  'project_manager',
  'manager',
])

export default class ExpireSprintReviewPackagesCommand {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async execute(dto: ExpireSprintReviewPackagesDTO): Promise<ExpireSprintReviewPackagesResult> {
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
      if (sprint.status !== 'review_open') {
        throw new BusinessLogicException('Project sprint review is not open')
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
      if (!actorCanManageSprint) {
        throw new ForbiddenException('Actor cannot manage project sprint')
      }

      const expiredRows = (await trx
        .from('sprint_review_packages')
        .where('sprint_id', sprint.id)
        .where('status', 'pending')
        .update({
          status: 'expired',
          updated_at: db.raw('NOW()'),
        })
        .returning('id')) as { id: string }[]

      await trx.commit()

      await auditPublicApi.write(this.execCtx, {
        action: 'expire_sprint_review_packages',
        entity_type: 'project_sprint',
        entity_id: sprint.id,
        new_values: {
          expired_package_count: expiredRows.length,
          reason: dto.reason ?? null,
        },
      })

      return {
        sprint_id: sprint.id,
        expired_package_count: expiredRows.length,
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
}
