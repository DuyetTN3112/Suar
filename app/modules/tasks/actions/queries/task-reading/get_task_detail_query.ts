import type GetTaskDetailDTO from '../../dtos/request/get_task_detail_dto.js'
import { mapTaskDetailOutput, type TaskQueryRecord } from '../../mappers/task-reading/task_query_output_mapper.js'

import {
  canOpenTaskWorkArea,
  resolveTaskDetailAuthorization,
  type TaskDetailAuthorization,
  type TaskDetailPermissions,
  type TaskResolvedBriefAssignmentAccess,
} from './internal/task_detail_authorizer.js'
import { resolveTaskDetailBrief } from './internal/task_detail_brief_resolver.js'
import {
  getOptionalRelations,
  getProjectSprintSummary,
  getReviewZoneSummary,
  getTaskReviewWorkflowDetail,
  loadTaskAuditLogs,
  loadTaskDetailWithIdentities,
} from './internal/task_detail_loader.js'

import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type {
  TaskExternalDependencies,
  TaskReviewZoneSummary,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskSprintSummary as TaskProjectSprintSummary } from '#modules/tasks/actions/ports/outbound/task_sprint_reader'
import type {
  TaskResolvedBriefProjectionV1,
} from '#modules/tasks/actions/queries/task-reading/internal/task_resolved_brief_projection'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'


export type {
  TaskDetailPermissions,
  TaskDetailAuthorization,
  TaskResolvedBriefAssignmentAccess,
}

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

    const task = await loadTaskDetailWithIdentities(
      dto.task_id,
      getOptionalRelations(dto),
      this.taskExternalDependencies
    )
    const {
      permissions,
      resolvedBriefAudience,
      resolvedBriefAssignmentAccess,
    } = await resolveTaskDetailAuthorization(
      userId,
      task,
      dto.surface,
      this.taskExternalDependencies
    )
    const canOpenWorkArea = canOpenTaskWorkArea(permissions)
    const [auditLogs, reviewZone, taskReviewDetail, projectSprint, resolvedBrief] = await Promise.all([
      canOpenWorkArea
        ? loadTaskAuditLogs(dto, task.id, this.taskExternalDependencies)
        : Promise.resolve(undefined),
      canOpenWorkArea
        ? getReviewZoneSummary(task.id, this.taskExternalDependencies)
        : Promise.resolve(undefined),
      getTaskReviewWorkflowDetail(task.id, this.taskExternalDependencies),
      getProjectSprintSummary(task, this.taskExternalDependencies),
      resolveTaskDetailBrief(
        task.organization_id,
        task.id,
        userId,
        resolvedBriefAudience,
        resolvedBriefAssignmentAccess,
        this.taskExternalDependencies
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

  private ensureUserId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
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
