import type GetTaskDetailDTO from '../dtos/request/get_task_detail_dto.js'
import { mapTaskDetailOutput, type TaskQueryRecord } from '../mapper/task_query_output_mapper.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  collectTaskUserIdentityIds,
  mapTaskDetailUserProjections,
} from '#modules/tasks/actions/mapper/task_user_projection_mapper'
import type {
  TaskExternalDependencies,
  TaskReviewZoneSummary,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskSprintSummary as TaskProjectSprintSummary } from '#modules/tasks/actions/ports/outbound/task_sprint_reader'
import { buildTaskPermissionContext } from '#modules/tasks/actions/services/task_permission_context_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canApplyForTask, canProcessApplication } from '#modules/tasks/domain/task_assignment_rules'
import { calculateTaskPermissions, canViewTask } from '#modules/tasks/domain/task_permission_policy'
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
    const [auditLogs, reviewZone, taskReviewDetail, projectSprint] = await Promise.all([
      canOpenWorkArea ? this.getAuditLogs(dto, task.id) : Promise.resolve(undefined),
      canOpenWorkArea ? this.getReviewZoneSummary(task.id) : Promise.resolve(undefined),
      this.getTaskReviewWorkflowDetail(task.id),
      this.getProjectSprintSummary(task),
    ])

    const result = this.buildResult(
      task,
      permissions,
      auditLogs,
      reviewZone,
      taskReviewDetail,
      projectSprint
    )
    await this.saveToCache(cacheKey, result)
    return result
  }

  /**
   * Load audit logs
   */
  private async loadAuditLogs(taskId: string, limit: number): Promise<unknown[]> {
    return this.taskExternalDependencies.audit.listTaskAuditTrail(taskId, limit)
  }

  private ensureUserId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async loadTask(taskId: string, optionalRelations: TaskDetailRelation[]) {
    const taskRecord = await this.taskExternalDependencies.lifecycle.findTaskDetail(
      taskId,
      undefined,
      optionalRelations
    )
    const identityIds = collectTaskUserIdentityIds([taskRecord], true)
    const identities =
      identityIds.length > 0
        ? await this.taskExternalDependencies.user.findUserIdentities(identityIds)
        : []
    const [task] = mapTaskDetailUserProjections([taskRecord], identities)
    if (!task) {
      throw new InvariantViolationException(`Task ${taskId} identity projection is unavailable`)
    }
    const [organization] =
      await this.taskExternalDependencies.org.findOrganizationSummaries([task.organization_id])
    const [project] = task.project_id
      ? await this.taskExternalDependencies.project.findProjectSummaries([task.project_id])
      : []

    return {
      ...task,
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            logo: organization.logo,
          }
        : null,
      project: project
        ? {
            id: project.id,
            name: project.name,
          }
        : null,
    }
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
      , this.taskExternalDependencies.activeAssignmentReader
    )
    enforcePolicy(canViewTask(permissionContext))
    const existingApplication =
      await this.taskExternalDependencies.lifecycle.findExistingApplication(task.id, userId)

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
    return (
      (await this.taskExternalDependencies.review.getTaskReviewZoneSummary(taskId)) ??
      undefined
    )
  }

  private async getTaskReviewWorkflowDetail(
    taskId: string
  ): Promise<Record<string, unknown> | null> {
    const detail = await this.taskExternalDependencies.review.getTaskReviewDetail(taskId)
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

  private async getProjectSprintSummary(
    task: Record<string, unknown>
  ): Promise<TaskProjectSprintSummary | null> {
    const taskId = typeof task['id'] === 'string' ? task['id'] : null

    if (!taskId) {
      return null
    }

    const sprintId =
      typeof task['project_sprint_id'] === 'string'
        ? task['project_sprint_id']
        : null
    const projectId =
      typeof task['project_id'] === 'string' ? task['project_id'] : null
    if (!sprintId || !projectId) {
      return null
    }

    return this.taskExternalDependencies.sprint.findSprint(projectId, sprintId)
  }

  private buildResult(
    task: unknown,
    permissions: TaskDetailPermissions,
    auditLogs?: unknown[],
    reviewZone?: TaskReviewZoneSummary,
    taskReviewDetail?: Record<string, unknown> | null,
    projectSprint?: TaskProjectSprintSummary | null
  ): TaskDetailResult {
    const mappedTask = mapTaskDetailOutput(task)

    return omitUndefined({
      task: {
        ...mappedTask,
        projectSprintId: projectSprint?.id ?? null,
        projectSprintName: projectSprint?.name ?? null,
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

    return cacheStore.get<TaskDetailResult>(key)
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string | null, data: TaskDetailResult): Promise<void> {
    if (!key) {
      return
    }

    await cacheStore.setBestEffort(key, data, 300)
  }
}
