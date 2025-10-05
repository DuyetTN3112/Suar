import type { SerializedModelRecord, SerializableModelRecord } from './model_response_serialization.js'
import { serializeModelForHttpResponse } from './model_response_serialization.js'

export interface TaskDetailPageResult {
  task: SerializableModelRecord | SerializedModelRecord
  permissions: {
    isCreator: boolean
    isAssignee: boolean
    canEdit: boolean
    canDelete: boolean
    canAssign: boolean
    canChangeStatus: boolean
    canApply: boolean
    canReviewApplications?: boolean
  }
  auditLogs?: unknown[]
  taskReviewDetail?: Record<string, unknown> | null
}

interface TaskDetailPageOptions {
  shellMode?: 'app' | 'organization'
  baseRoute?: string
}

export interface TaskEditPageResult {
  task: SerializableModelRecord | SerializedModelRecord
  permissions: {
    isCreator: boolean
    isAssignee: boolean
    canEdit: boolean
    canDelete: boolean
    canAssign: boolean
  }
  metadata: {
    statuses: { value: string; label: string }[]
    labels: { value: string; label: string }[]
    priorities: { value: string; label: string }[]
    users: { id: string; username: string; email: string }[]
    parentTasks: { id: string; title: string; task_status_id: string | null }[]
    projects: { id: string; name: string }[]
  }
}

export function mapTaskCreateApiBody(task: SerializableModelRecord | SerializedModelRecord) {
  return {
    data: serializeModelForHttpResponse(task),
  }
}

export function mapTaskUpdateApiBody(task: SerializableModelRecord | SerializedModelRecord) {
  return {
    data: serializeModelForHttpResponse(task),
  }
}

export function mapTaskStatusApiBody(task: SerializableModelRecord | SerializedModelRecord) {
  return {
    data: serializeModelForHttpResponse(task),
  }
}

export function mapTaskSortOrderApiBody(task: SerializableModelRecord | SerializedModelRecord) {
  return {
    data: serializeModelForHttpResponse(task),
  }
}

export function mapTaskDetailApiBody(task: SerializableModelRecord | SerializedModelRecord) {
  return {
    data: serializeModelForHttpResponse(task),
  }
}

export function mapTaskDetailPageProps(result: TaskDetailPageResult) {
  const props = {
    task: serializeModelForHttpResponse(result.task),
    permissions: result.permissions,
    auditLogs: result.auditLogs,
  }

  if ('taskReviewDetail' in result) {
    return {
      ...props,
      taskReviewDetail: result.taskReviewDetail ?? null,
    }
  }

  return props
}

export function mapScopedTaskDetailPageProps(
  result: TaskDetailPageResult,
  options?: TaskDetailPageOptions
) {
  return {
    ...mapTaskDetailPageProps(result),
    shellMode: options?.shellMode ?? 'app',
    baseRoute: options?.baseRoute ?? '/tasks',
  }
}

export function mapTaskEditPageProps(result: TaskEditPageResult) {
  return {
    task: serializeModelForHttpResponse(result.task),
    metadata: result.metadata,
    permissions: result.permissions,
  }
}
