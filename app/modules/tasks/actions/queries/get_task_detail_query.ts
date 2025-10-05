import db from '@adonisjs/lucid/services/db'

import type GetTaskDetailDTO from '../dtos/request/get_task_detail_dto.js'
import { mapTaskDetailOutput, type TaskQueryRecord } from '../mapper/task_query_output_mapper.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { getTaskReviewDetailByTask } from '#modules/reviews/infra/repositories/read/task_review_board_queries'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canApplyForTask, canProcessApplication } from '#modules/tasks/domain/task_assignment_rules'
import { calculateTaskPermissions, canViewTask } from '#modules/tasks/domain/task_permission_policy'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import type { TaskDetailRecord, TaskDetailRelation } from '#modules/tasks/types/task_records'

interface TaskDetailPermissions {
  isCreator: boolean
  isAssignee: boolean
  canEdit: boolean
  canDelete: boolean
  canAssign: boolean
  canChangeStatus: boolean
  canApply: boolean
  canReviewApplications: boolean
}

interface TaskReviewZoneSummary {
  submission_id: string | null
  submission_status: string | null
  review_session_id: string | null
  review_session_status: string | null
  dispute_id: string | null
  dispute_status: string | null
  creator_review_completed: boolean | null
  manager_reviews_count: number
  peer_reviews_count: number
  required_total_reviews: number | null
  required_peer_reviews: number | null
  required_pending_assignments: number
  optional_pending_assignments: number
}

export interface TaskDetailResult {
  task: TaskQueryRecord
  permissions: TaskDetailPermissions
  auditLogs?: unknown[]
  taskReviewDetail?: Record<string, unknown> | null
}

/**
 * Query để lấy chi tiết một task
 *
 * Features:
 * - Load full task với all relations
 * - Optional: versions, childTasks, auditLogs
 * - Permission check (Admin hoặc Assignee)
 * - Redis caching (5 minutes)
 * - Permissions object (isCreator, canEdit, canDelete, etc.)
 *
 * Permissions:
 * - Admin/Superadmin: Xem tất cả
 * - Assignee: Xem task được assign
 * - Creator: Xem task đã tạo
 * - Org Owner/Manager: Xem tasks trong org
 */
export default class GetTaskDetailQuery {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies
  ) {}

  /**
   * Execute query
   */
  async execute(dto: GetTaskDetailDTO): Promise<TaskDetailResult> {
    const userId = this.ensureUserId()
    const cacheKey = null
    const cachedResult = await this.getFromCache(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    const task = await this.loadTask(dto.task_id, this.getOptionalRelations(dto))
    const permissions = await this.getPermissions(userId, task)
    const canOpenWorkArea = this.canOpenTaskWorkArea(permissions)
    const [auditLogs, reviewZone, taskReviewDetail] = await Promise.all([
      canOpenWorkArea ? this.getAuditLogs(dto, task.id) : Promise.resolve(undefined),
      canOpenWorkArea ? this.getReviewZoneSummary(task.id) : Promise.resolve(undefined),
      this.getTaskReviewWorkflowDetail(task.id),
    ])

    const result = this.buildResult(task, permissions, auditLogs, reviewZone, taskReviewDetail)
    await this.saveToCache(cacheKey, result)
    return result
  }

  /**
   * Load audit logs
   */
  private async loadAuditLogs(taskId: string, limit: number): Promise<unknown[]> {
    const logs = await auditPublicApi.listByEntity('task', taskId, limit)
    const userMap = await auditPublicApi.buildUserMap(logs, ['id', 'username', 'email'])

    return logs.map((log) => {
      const user = userMap.get(log.user_id ?? '')
      return {
        id: log.id,
        action: log.action,
        user: user
          ? {
              id: user.id,
              name: user.username ?? 'Unknown',
              email: user.email ?? '',
            }
          : null,
        timestamp: log.created_at,
        changes: auditPublicApi.formatChanges(log.old_values ?? {}, log.new_values ?? {}),
      }
    })
  }

  private ensureUserId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async loadTask(taskId: string, optionalRelations: TaskDetailRelation[]) {
    return await detailQueries.findByIdWithDetailRecord(taskId, undefined, optionalRelations)
  }

  private async getPermissions(
    userId: string,
    task: TaskDetailRecord
  ): Promise<TaskDetailPermissions> {
    const permissionContext = await buildTaskPermissionContext(
      userId,
      task,
      undefined,
      this.taskExternalDependencies.permission
    )
    enforcePolicy(canViewTask(permissionContext))
    const existingApplication =
      await TaskApplicationRepository.findExistingNonWithdrawnByTaskAndApplicant(task.id, userId)

    const taskPermissions = calculateTaskPermissions(permissionContext)
    const canReviewApplications = canProcessApplication({
      actorId: userId,
      taskCreatorId: task.creator_id,
      action: 'reject',
      isTaskAlreadyAssigned: task.assigned_to !== null,
      isProjectOwnerOrManager:
        permissionContext.actorProjectRole === 'project_owner' ||
        permissionContext.actorProjectRole === 'project_manager',
      isOrganizationOwnerOrAdmin:
        permissionContext.actorOrgRole === 'org_owner' ||
        permissionContext.actorOrgRole === 'org_admin',
    }).allowed

    return {
      ...taskPermissions,
      canApply:
        !canReviewApplications &&
        canApplyForTask({
          actorId: userId,
          taskCreatorId: task.creator_id,
          taskVisibility: task.task_visibility ?? '',
          isTaskAlreadyAssigned: task.assigned_to !== null,
          isApplicationDeadlinePassed: this.isApplicationDeadlinePassed(task.application_deadline),
          hasExistingApplication: !!existingApplication,
        }).allowed,
      canReviewApplications,
    }
  }

  private isApplicationDeadlinePassed(deadline: string | null | undefined): boolean {
    return typeof deadline === 'string' && new Date(deadline).getTime() <= Date.now()
  }

  private canOpenTaskWorkArea(permissions: TaskDetailPermissions): boolean {
    return (
      permissions.isCreator ||
      permissions.isAssignee ||
      permissions.canEdit ||
      permissions.canAssign ||
      permissions.canChangeStatus
    )
  }

  private getOptionalRelations(dto: GetTaskDetailDTO): TaskDetailRelation[] {
    const relations: TaskDetailRelation[] = []

    if (dto.shouldLoadChildTasks()) {
      relations.push('childTasks')
    }

    if (dto.shouldLoadVersions()) {
      relations.push('versions')
    }

    return relations
  }

  private async getAuditLogs(
    dto: GetTaskDetailDTO,
    taskId: string
  ): Promise<unknown[] | undefined> {
    if (!dto.shouldLoadAuditLogs()) {
      return undefined
    }

    return await this.loadAuditLogs(taskId, dto.audit_logs_limit)
  }

  private async getReviewZoneSummary(taskId: string): Promise<TaskReviewZoneSummary | undefined> {
    const submission = (await db
      .from('task_submissions')
      .where('task_id', taskId)
      .orderBy('updated_at', 'desc')
      .orderBy('created_at', 'desc')
      .select('id', 'status')
      .first()) as { id: string; status: string } | undefined

    const reviewSession = (await db
      .from('review_sessions as rs')
      .join('task_assignments as ta', 'ta.id', 'rs.task_assignment_id')
      .where('ta.task_id', taskId)
      .orderBy('rs.created_at', 'desc')
      .select(
        'rs.id',
        'rs.status',
        'rs.creator_review_completed',
        'rs.manager_reviews_count',
        'rs.peer_reviews_count',
        'rs.required_total_reviews',
        'rs.required_peer_reviews'
      )
      .first()) as
      | {
          id: string
          status: string
          creator_review_completed: boolean | null
          manager_reviews_count: number | null
          peer_reviews_count: number | null
          required_total_reviews: number | null
          required_peer_reviews: number | null
        }
      | undefined

    let dispute:
      | {
          id: string
          status: string
        }
      | undefined
    let requiredPendingAssignments = 0
    let optionalPendingAssignments = 0

    if (reviewSession) {
      dispute = (await db
        .from('review_disputes')
        .where('review_session_id', reviewSession.id)
        .orderBy('created_at', 'desc')
        .select('id', 'status')
        .first()) as { id: string; status: string } | undefined

      const pendingAssignments = (await db
        .from('review_session_reviewer_assignments')
        .where('review_session_id', reviewSession.id)
        .where('status', 'pending')
        .select('is_required')) as Array<{ is_required: boolean }>

      requiredPendingAssignments = pendingAssignments.filter((row) => row.is_required).length
      optionalPendingAssignments = pendingAssignments.length - requiredPendingAssignments
    }

    if (!submission && !reviewSession && !dispute) {
      return undefined
    }

    return {
      submission_id: submission?.id ?? null,
      submission_status: submission?.status ?? null,
      review_session_id: reviewSession?.id ?? null,
      review_session_status: reviewSession?.status ?? null,
      dispute_id: dispute?.id ?? null,
      dispute_status: dispute?.status ?? null,
      creator_review_completed: reviewSession?.creator_review_completed ?? null,
      manager_reviews_count: reviewSession?.manager_reviews_count ?? 0,
      peer_reviews_count: reviewSession?.peer_reviews_count ?? 0,
      required_total_reviews: reviewSession?.required_total_reviews ?? null,
      required_peer_reviews: reviewSession?.required_peer_reviews ?? null,
      required_pending_assignments: requiredPendingAssignments,
      optional_pending_assignments: optionalPendingAssignments,
    }
  }

  private async getTaskReviewWorkflowDetail(taskId: string): Promise<Record<string, unknown> | null> {
    const detail = await getTaskReviewDetailByTask(taskId)
    if (!this.canShowTaskReviewWorkflow(detail)) {
      return null
    }

    return detail
  }

  private canShowTaskReviewWorkflow(detail: Record<string, unknown> | null): boolean {
    if (!detail) {
      return false
    }

    if (detail['workflow']) {
      return true
    }

    const task = detail['task'] as Record<string, unknown> | undefined
    const status = typeof task?.['status'] === 'string' ? task['status'] : ''
    return status === 'done' || status === 'in_review'
  }

  private buildResult(
    task: unknown,
    permissions: TaskDetailPermissions,
    auditLogs?: unknown[],
    reviewZone?: TaskReviewZoneSummary,
    taskReviewDetail?: Record<string, unknown> | null
  ): TaskDetailResult {
    const mappedTask = mapTaskDetailOutput(task)

    return omitUndefined({
      task: {
        ...mappedTask,
        review_zone: reviewZone ?? null,
      },
      permissions,
      auditLogs,
      taskReviewDetail,
    })
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string | null): Promise<TaskDetailResult | null> {
    if (!key) {
      return null
    }

    try {
      const cached = await cacheStore.get<TaskDetailResult>(key)
      if (cached) {
        return cached
      }
    } catch (error) {
      loggerService.error('[GetTaskDetailQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string | null, data: TaskDetailResult): Promise<void> {
    if (!key) {
      return
    }

    try {
      await cacheStore.set(key, data, 300)
    } catch (error) {
      loggerService.error('[GetTaskDetailQuery] Cache set error:', error)
    }
  }
}
