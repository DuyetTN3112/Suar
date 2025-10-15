import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  canTransitionProjectSprint,
  type ProjectSprintStatus,
} from '#modules/reviews/domain/sprint_review_rules'

export interface CloseProjectSprintReviewDTO {
  sprint_id: string
  project_id?: string
}

export interface CloseProjectSprintReviewResult {
  sprint_id: string
  status: 'review_open'
  review_opened_at: DateTime
  created_package_count: number
  reviewer_ids: string[]
  next_sprint_id: string
}

interface SprintRecord {
  id: string
  organization_id: string
  project_id: string
  name: string
  status: string
  starts_at: string | Date
  ends_at: string | Date
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

export default class CloseProjectSprintReviewCommand {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async execute(dto: CloseProjectSprintReviewDTO): Promise<CloseProjectSprintReviewResult> {
    const actorId = this.requireUserId()
    const trx = await db.transaction()

    try {
      let sprintQuery = trx.from('project_sprints').where('id', dto.sprint_id)
      if (dto.project_id !== undefined) {
        sprintQuery = sprintQuery.where('project_id', dto.project_id)
      }
      const sprint = (await sprintQuery.forUpdate().first()) as SprintRecord | undefined

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
      const sprintStatus = this.toProjectSprintStatus(sprint.status)
      const actorCanManageSprint =
        actorId === project.owner_id ||
        actorId === project.manager_id ||
        (actorRole !== null && MANAGER_PROJECT_ROLES.has(actorRole))

      const transition = canTransitionProjectSprint({
        from: sprintStatus,
        to: 'review_open',
        actorCanManageSprint,
      })

      if (!transition.allowed) {
        if (!actorCanManageSprint) {
          throw new ForbiddenException(transition.reason ?? 'Actor cannot manage project sprint')
        }
        throw new BusinessLogicException(transition.reason ?? 'Invalid project sprint transition')
      }

      await this.assertPreviousReverseReviewsDone(sprint, trx)
      await this.assertTaskReviewsDone(sprint.id, trx)
      const reviewerIds = await this.findEligibleReviewerIds(sprint.project_id, sprint.id, trx)
      const now = DateTime.utc()

      await trx.from('project_sprints').where('id', sprint.id).update({
        status: 'review_open',
        closed_by: actorId,
        review_opened_at: now.toSQL(),
        updated_at: now.toSQL(),
      })

      const existingPackages = (await trx
        .from('sprint_review_packages')
        .where('sprint_id', sprint.id)
        .whereIn('reviewer_id', reviewerIds)
        .select('reviewer_id')) as { reviewer_id: string }[]
      const existingReviewerIds = new Set(existingPackages.map((row) => row.reviewer_id))
      const newReviewerIds = reviewerIds.filter(
        (reviewerId) => !existingReviewerIds.has(reviewerId)
      )

      if (newReviewerIds.length > 0) {
        await trx.table('sprint_review_packages').multiInsert(
          newReviewerIds.map((reviewerId) => ({
            id: randomUUID(),
            sprint_id: sprint.id,
            reviewer_id: reviewerId,
            status: 'pending',
            submitted_at: null,
            created_at: now.toSQL(),
            updated_at: now.toSQL(),
          }))
        )
      }
      await this.ensureReverseReviewWorkflows({
        sprint,
        project,
        reviewerIds,
        trx,
        now,
      })
      const nextSprintId = await this.createNextSprint({
        sprint,
        actorId,
        trx,
        now,
      })

      await trx.commit()

      await auditPublicApi.write(this.execCtx, {
        action: 'open_sprint_review',
        entity_type: 'project_sprint',
        entity_id: sprint.id,
        new_values: {
          status: 'review_open',
          reviewer_ids: reviewerIds,
          created_package_count: newReviewerIds.length,
          next_sprint_id: nextSprintId,
        },
      })
      await Promise.all(
        reviewerIds.map((reviewerId) =>
          notificationPublicApi.handle({
            user_id: reviewerId,
            title: 'Review sau sprint đã mở',
            message: 'Hãy review người giao việc trong sprint và môi trường làm việc của bạn.',
            type: BACKEND_NOTIFICATION_TYPES.REVIEW_REQUESTED,
            related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.PROJECT_SPRINT,
            related_entity_id: sprint.id,
          })
        )
      )

      return {
        sprint_id: sprint.id,
        status: 'review_open',
        review_opened_at: now,
        created_package_count: newReviewerIds.length,
        reviewer_ids: reviewerIds,
        next_sprint_id: nextSprintId,
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

  private async findEligibleReviewerIds(
    projectId: string,
    sprintId: string,
    trx: TransactionClientContract
  ): Promise<string[]> {
    const rowsResult: unknown = await trx.rawQuery(
      `
        select user_id
        from (
          select t.creator_id as user_id
          from tasks t
          where t.project_id = ? and t.project_sprint_id = ?
          union
          select t.assigned_to as user_id
          from tasks t
          where t.project_id = ? and t.project_sprint_id = ? and t.assigned_to is not null
          union
          select ta.assignee_id as user_id
          from task_assignments ta
          inner join tasks t on t.id = ta.task_id
          where t.project_id = ? and t.project_sprint_id = ?
          union
          select ta.assigned_by as user_id
          from task_assignments ta
          inner join tasks t on t.id = ta.task_id
          where t.project_id = ? and t.project_sprint_id = ?
        ) sprint_workers
        where user_id is not null
      `,
      [projectId, sprintId, projectId, sprintId, projectId, sprintId, projectId, sprintId]
    )
    const rows = rowsResult as { rows?: { user_id: string | null }[] }

    return Array.from(
      new Set(
        (rows.rows ?? [])
          .map((row) => row.user_id)
          .filter((userId): userId is string => Boolean(userId))
      )
    ).sort()
  }

  private async assertTaskReviewsDone(
    sprintId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    const rowResult: unknown = await trx.rawQuery(
      `
        select count(*)::int as total
        from task_review_workflows trw
        inner join tasks t on t.id = trw.task_id
        where t.project_sprint_id = ?
          and trw.status <> 'done'
      `,
      [sprintId]
    )
    const row = rowResult as { rows?: { total: number | string }[] }

    const total = Number(row.rows?.[0]?.total ?? 0)
    if (total > 0) {
      throw new BusinessLogicException('Cannot close sprint while task reviews are not done', {
        pending_task_review_count: total,
      })
    }
  }

  private async assertPreviousReverseReviewsDone(
    sprint: SprintRecord,
    trx: TransactionClientContract
  ): Promise<void> {
    const previousSprint = (await trx
      .from('project_sprints')
      .where('project_id', sprint.project_id)
      .where('ends_at', '<=', sprint.starts_at)
      .whereNot('id', sprint.id)
      .orderBy('ends_at', 'desc')
      .select('id')
      .first()) as { id: string } | undefined

    if (!previousSprint) {
      return
    }

    const row = (await trx
      .from('sprint_reverse_review_workflows')
      .where('sprint_id', previousSprint.id)
      .whereNot('status', 'done')
      .count('* as total')
      .first()) as { total?: string | number } | undefined

    const total = Number(row?.total ?? 0)
    if (total > 0) {
      throw new BusinessLogicException(
        'Cannot close sprint while previous review sau sprint workflows are not done',
        { pending_reverse_review_count: total, previous_sprint_id: previousSprint.id }
      )
    }
  }

  private async ensureReverseReviewWorkflows(input: {
    sprint: SprintRecord
    project: ProjectRecord
    reviewerIds: string[]
    trx: TransactionClientContract
    now: DateTime
  }): Promise<void> {
    const { sprint, project, reviewerIds, trx, now } = input
    const packages = (await trx
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .whereIn('reviewer_id', reviewerIds)
      .select('id', 'reviewer_id')) as { id: string; reviewer_id: string }[]
    const packageIdByReviewer = new Map(packages.map((row) => [row.reviewer_id, row.id]))
    const existing = (await trx
      .from('sprint_reverse_review_workflows')
      .where('sprint_id', sprint.id)
      .select('reviewer_id', 'target_type', 'target_user_id', 'target_entity_id')) as Array<{
      reviewer_id: string
      target_type: string
      target_user_id: string | null
      target_entity_id: string | null
    }>
    const existingKeys = new Set(
      existing.map((row) =>
        [
          row.reviewer_id,
          row.target_type,
          row.target_user_id ?? '',
          row.target_entity_id ?? '',
        ].join(':')
      )
    )
    const workflowRows: Record<string, unknown>[] = []
    const assignerTargets = await this.findAssignerTargets(sprint.project_id, sprint.id, trx)

    for (const target of assignerTargets) {
      if (!reviewerIds.includes(target.reviewer_id)) continue
      const key = [target.reviewer_id, 'assigner', target.target_user_id, ''].join(':')
      if (existingKeys.has(key)) continue
      workflowRows.push({
        id: randomUUID(),
        sprint_id: sprint.id,
        project_id: sprint.project_id,
        organization_id: sprint.organization_id,
        reviewer_id: target.reviewer_id,
        target_type: 'assigner',
        target_user_id: target.target_user_id,
        target_entity_id: null,
        responder_id: target.target_user_id,
        status: 'awaiting_review',
        rating: null,
        comment: null,
        package_id: packageIdByReviewer.get(target.reviewer_id) ?? null,
        submitted_at: null,
        accepted_at: null,
        reported_at: null,
        created_at: now.toSQL(),
        updated_at: now.toSQL(),
      })
    }

    const environmentResponderId = await this.resolveEnvironmentResponder(
      sprint.organization_id,
      project,
      trx
    )
    for (const reviewerId of reviewerIds) {
      const key = [reviewerId, 'environment', '', sprint.organization_id].join(':')
      if (existingKeys.has(key)) continue
      workflowRows.push({
        id: randomUUID(),
        sprint_id: sprint.id,
        project_id: sprint.project_id,
        organization_id: sprint.organization_id,
        reviewer_id: reviewerId,
        target_type: 'environment',
        target_user_id: null,
        target_entity_id: sprint.organization_id,
        responder_id: environmentResponderId,
        status: 'awaiting_review',
        rating: null,
        comment: null,
        package_id: packageIdByReviewer.get(reviewerId) ?? null,
        submitted_at: null,
        accepted_at: null,
        reported_at: null,
        created_at: now.toSQL(),
        updated_at: now.toSQL(),
      })
    }

    if (workflowRows.length > 0) {
      await trx.table('sprint_reverse_review_workflows').multiInsert(workflowRows)
    }
  }

  private async findAssignerTargets(
    projectId: string,
    sprintId: string,
    trx: TransactionClientContract
  ): Promise<Array<{ reviewer_id: string; target_user_id: string }>> {
    const rawResult: unknown = await trx.rawQuery(
      `
        select reviewer_id, target_user_id
        from (
          select ta.assignee_id as reviewer_id, ta.assigned_by as target_user_id
          from task_assignments ta
          inner join tasks t on t.id = ta.task_id
          where t.project_id = ? and t.project_sprint_id = ?
          union
          select t.assigned_to as reviewer_id, t.creator_id as target_user_id
          from tasks t
          where t.project_id = ? and t.project_sprint_id = ? and t.assigned_to is not null
        ) assigner_evidence
        where reviewer_id is not null
          and target_user_id is not null
          and reviewer_id <> target_user_id
        group by reviewer_id, target_user_id
      `,
      [projectId, sprintId, projectId, sprintId]
    )
    const result = rawResult as { rows?: Array<{ reviewer_id: string; target_user_id: string }> }

    return result.rows ?? []
  }

  private async resolveEnvironmentResponder(
    organizationId: string,
    project: ProjectRecord,
    trx: TransactionClientContract
  ): Promise<string | null> {
    if (project.owner_id) return project.owner_id
    if (project.manager_id) return project.manager_id

    const orgOwner = (await trx
      .from('organizations')
      .where('id', organizationId)
      .select('owner_id')
      .first()) as { owner_id: string | null } | undefined
    if (orgOwner?.owner_id) return orgOwner.owner_id

    const orgAdmin = (await trx
      .from('organization_users')
      .where('organization_id', organizationId)
      .whereIn('org_role', ['org_owner', 'org_admin', 'admin'])
      .where('status', 'approved')
      .select('user_id')
      .first()) as { user_id: string } | undefined

    return orgAdmin?.user_id ?? null
  }

  private async createNextSprint(input: {
    sprint: SprintRecord
    actorId: string
    trx: TransactionClientContract
    now: DateTime
  }): Promise<string> {
    const { sprint, actorId, trx, now } = input
    const startsAt = this.parsePersistedDateTime(sprint.ends_at)
    const previousStartsAt = this.parsePersistedDateTime(sprint.starts_at)
    const durationMillis = startsAt.toMillis() - previousStartsAt.toMillis()
    const safeDurationMillis = durationMillis > 0 ? durationMillis : 14 * 24 * 60 * 60 * 1000
    const endsAt = startsAt.plus({ milliseconds: safeDurationMillis })
    const nextSprintId = randomUUID()

    await trx.table('project_sprints').insert({
      id: nextSprintId,
      organization_id: sprint.organization_id,
      project_id: sprint.project_id,
      name: `${sprint.name} next`,
      status: 'active',
      starts_at: startsAt.toSQL(),
      ends_at: endsAt.toSQL(),
      created_by: actorId,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
      created_at: now.toSQL(),
      updated_at: now.toSQL(),
    })

    return nextSprintId
  }

  private parsePersistedDateTime(value: string | Date): DateTime {
    if (value instanceof Date) return DateTime.fromJSDate(value).toUTC()
    return DateTime.fromISO(value, { setZone: true }).toUTC()
  }
}
