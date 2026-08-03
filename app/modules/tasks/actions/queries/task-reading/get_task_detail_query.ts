import type GetTaskDetailDTO from '../../dtos/request/get_task_detail_dto.js'
import { mapTaskDetailOutput, type TaskQueryRecord } from '../../mappers/task-reading/task_query_output_mapper.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import DependencyUnavailableException from '#modules/errors/public_contracts/dependency_unavailable_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import {
  collectTaskUserIdentityIds,
  mapTaskDetailUserProjections,
} from '#modules/tasks/actions/mappers/task-reading/task_user_projection_mapper'
import type {
  TaskExternalDependencies,
  TaskReviewZoneSummary,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskSprintSummary as TaskProjectSprintSummary } from '#modules/tasks/actions/ports/outbound/task_sprint_reader'
import { buildTaskResolvedBriefCacheKey } from '#modules/tasks/actions/queries/task-reading/internal/task_resolved_brief_cache_key'
import {
  projectMissingAssignmentSnapshotBrief,
  projectStaleAssignmentAccessBrief,
  projectTaskAssignmentResolvedBrief,
  projectTaskResolvedBrief,
  type TaskResolvedBriefAudience,
  type TaskResolvedBriefProjectionV1,
} from '#modules/tasks/actions/queries/task-reading/internal/task_resolved_brief_projection'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { buildTaskPermissionContext } from '#modules/tasks/actions/task_permission_context'
import { canApplyForTask, canProcessApplication } from '#modules/tasks/domain/task-assignment/task_assignment_rules'
import {
  calculateTaskPermissions,
  canViewTask,
  canViewTaskOnMarketplace,
} from '#modules/tasks/domain/task-assignment/task_permission_policy'
import { resolveTaskResolvedBriefAudience } from '#modules/tasks/domain/task-authoring/task_resolved_brief_access_policy'
import type { TaskDetailRecord, TaskDetailRelation } from '#modules/tasks/types/task_records'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


interface TaskDetailPermissions {
  isCreator: boolean
  isAssignee: boolean
  canEdit: boolean
  canDelete: boolean
  canAssign: boolean
  canChangeStatus: boolean
  canComment: boolean
  canApply: boolean
  canReviewApplications: boolean
}

interface TaskDetailAuthorization {
  permissions: TaskDetailPermissions
  resolvedBriefAudience: TaskResolvedBriefAudience
  resolvedBriefAssignmentAccess: TaskResolvedBriefAssignmentAccess | null
}

interface TaskResolvedBriefAssignmentAccess {
  readonly id: string
  readonly assigneeId: string
  readonly status: 'active' | 'completed'
}

export interface TaskDetailResult {
  task: TaskQueryRecord
  permissions: TaskDetailPermissions
  auditLogs?: unknown[]
  taskReviewDetail?: Record<string, unknown> | null
  resolved_brief: TaskResolvedBriefProjectionV1
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
export default class GetTaskDetailQuery extends BaseQuery<GetTaskDetailDTO, TaskDetailResult> {
  constructor(
    protected override execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies
  ) {
    super(execCtx)
  }

  async handle(dto: GetTaskDetailDTO): Promise<TaskDetailResult> {
    return this.execute(dto)
  }

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
    const {
      permissions,
      resolvedBriefAudience,
      resolvedBriefAssignmentAccess,
    } = await this.getPermissions(userId, task, dto.surface)
    const canOpenWorkArea = this.canOpenTaskWorkArea(permissions)
    const [auditLogs, reviewZone, taskReviewDetail, projectSprint, resolvedBrief] = await Promise.all([
      canOpenWorkArea ? this.getAuditLogs(dto, task.id) : Promise.resolve(undefined),
      canOpenWorkArea ? this.getReviewZoneSummary(task.id) : Promise.resolve(undefined),
      this.getTaskReviewWorkflowDetail(task.id),
      this.getProjectSprintSummary(task),
      this.getResolvedBrief(
        task.organization_id,
        task.id,
        userId,
        resolvedBriefAudience,
        resolvedBriefAssignmentAccess
      ),
    ])

    const result = this.buildResult(
      task,
      permissions,
      auditLogs,
      reviewZone,
      taskReviewDetail,
      projectSprint,
      resolvedBrief
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

    const projectPayload = project
      ? {
          id: project.id,
          name: project.name,
          ...(project.visibility ? { visibility: project.visibility } : {}),
          ...(typeof project.allowExternalContributors === 'boolean'
            ? { allow_external_contributors: project.allowExternalContributors }
            : {}),
        }
      : null

    return {
      ...task,
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            logo: organization.logo,
          }
        : null,
      project: projectPayload,
    }
  }

  private async getPermissions(
    userId: string,
    task: TaskDetailRecord,
    surface: 'project' | 'marketplace'
  ): Promise<TaskDetailAuthorization> {
    const permissionContext = await buildTaskPermissionContext(
      userId,
      task,
      undefined,
      this.taskExternalDependencies.permission,
      this.taskExternalDependencies.activeAssignmentReader
    )
    const isApprovedOrganizationMember =
      surface === 'marketplace'
        ? await this.taskExternalDependencies.org.isApprovedMember(
            userId,
            task.organization_id
          )
        : false
    if (surface === 'marketplace') {
      enforcePolicy(
        canViewTaskOnMarketplace({
          ...permissionContext,
          isApprovedOrganizationMember,
          projectVisibility: task.project?.visibility ?? null,
          allowExternalContributors: task.project?.allow_external_contributors ?? null,
        })
      )
    } else {
      enforcePolicy(canViewTask(permissionContext))
    }
    const [existingApplication, resolvedBriefAssignmentAccess] = await Promise.all([
      this.taskExternalDependencies.lifecycle.findExistingApplication(task.id, userId),
      this.taskExternalDependencies.activeAssignmentReader?.findActorAssignment(task.id, userId) ??
        Promise.resolve(null),
    ])

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

    const policyAudience = resolveTaskResolvedBriefAudience(permissionContext)
    const resolvedBriefAudience =
      policyAudience === 'creator_edit'
        ? 'creator_edit'
        : policyAudience === 'work_participant' &&
            resolvedBriefAssignmentAccess?.assigneeId === userId
          ? 'work_participant'
          : policyAudience === 'project_member'
            ? 'project_member'
            : 'public_preview'

    return {
      permissions: {
        ...taskPermissions,
        ...(surface === 'marketplace'
          ? {
              canEdit: false,
              canDelete: false,
              canAssign: false,
              canChangeStatus: false,
              canComment: false,
            }
          : {}),
        canApply:
          !canReviewApplications &&
          canApplyForTask({
            actorId: userId,
            taskCreatorId: task.creator_id,
            taskVisibility: task.task_visibility ?? '',
            isOrganizationMember: Boolean(permissionContext.actorOrgRole),
            isPublicProject: task.project?.visibility === 'public',
            allowsExternalContributors:
              task.project?.allow_external_contributors === true,
            isTaskAlreadyAssigned: task.assigned_to !== null,
            isApplicationDeadlinePassed: this.isApplicationDeadlinePassed(task.application_deadline),
            hasExistingApplication: !!existingApplication,
          }).allowed,
        canReviewApplications,
      },
      resolvedBriefAudience,
      resolvedBriefAssignmentAccess,
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

  private async getResolvedBrief(
    organizationId: string,
    taskId: string,
    actorId: string,
    audience: TaskResolvedBriefAudience,
    assignmentAccess: TaskResolvedBriefAssignmentAccess | null
  ): Promise<TaskResolvedBriefProjectionV1> {
    const actorAssignment =
      audience === 'work_participant' && assignmentAccess
        ? await this.taskExternalDependencies.activeAssignmentReader?.findActorAssignment(
            taskId,
            actorId
          )
        : null
    const assignmentAccessIsCurrent =
      assignmentAccess !== null &&
      actorAssignment?.id === assignmentAccess.id &&
      actorAssignment.assigneeId === actorId &&
      actorAssignment.status === assignmentAccess.status
    const assignmentSnapshot =
      assignmentAccessIsCurrent && this.taskExternalDependencies.assignmentContract
        ? await this.taskExternalDependencies.assignmentContract.repository.findCurrent(
            assignmentAccess.id
          )
        : null
    const snapshotMatchesActor =
      assignmentSnapshot !== null &&
      assignmentAccess !== null &&
      assignmentSnapshot.assignmentId === assignmentAccess.id &&
      assignmentSnapshot.envelope.snapshot.assigneeId === actorId
    if (audience === 'work_participant' && assignmentAccess) {
      const cacheKey = buildTaskResolvedBriefCacheKey({
        organizationId,
        taskId,
        audience,
        bundle: null,
        assignmentSnapshot: snapshotMatchesActor ? assignmentSnapshot : null,
        assignmentAccessId: assignmentAccess.id,
      })
      const cached = await cacheStore.get<TaskResolvedBriefProjectionV1>(cacheKey)
      if (cached) return cached

      const projection =
        !assignmentAccessIsCurrent
          ? projectStaleAssignmentAccessBrief(audience)
          : assignmentSnapshot && snapshotMatchesActor
            ? projectTaskAssignmentResolvedBrief(assignmentSnapshot, audience)
            : projectMissingAssignmentSnapshotBrief(audience)
      await cacheStore.setBestEffort(cacheKey, projection, 300)
      return projection
    }

    const reader = this.taskExternalDependencies.resolvedBrief
    if (!reader) {
      throw new DependencyUnavailableException('task_resolved_brief_reader', 'read_current_bundle')
    }
    const bundle = await reader.readCurrentBundle(taskId)
    const cacheKey = buildTaskResolvedBriefCacheKey({
      organizationId,
      taskId,
      audience,
      bundle,
      assignmentSnapshot: snapshotMatchesActor ? assignmentSnapshot : null,
    })
    const cached = await cacheStore.get<TaskResolvedBriefProjectionV1>(cacheKey)
    if (cached) return cached

    const projection = projectTaskResolvedBrief(bundle, audience)
    await cacheStore.setBestEffort(cacheKey, projection, 300)
    return projection
  }

  private buildResult(
    task: unknown,
    permissions: TaskDetailPermissions,
    auditLogs: unknown[] | undefined,
    reviewZone: TaskReviewZoneSummary | undefined,
    taskReviewDetail: Record<string, unknown> | null | undefined,
    projectSprint: TaskProjectSprintSummary | null | undefined,
    resolvedBrief: TaskResolvedBriefProjectionV1
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
      resolved_brief: resolvedBrief,
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
