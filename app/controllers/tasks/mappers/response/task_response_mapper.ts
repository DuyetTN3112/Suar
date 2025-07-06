import type { ResponseRecord, SerializableResponseRecord } from './shared.js'
import { serializeForResponse } from './shared.js'

export interface TaskDetailPageResult {
  task: SerializableResponseRecord | ResponseRecord
  permissions: {
    isCreator: boolean
    isAssignee: boolean
    canEdit: boolean
    canDelete: boolean
    canAssign: boolean
  }
  auditLogs?: unknown[]
}

export interface TaskEditPageResult {
  task: SerializableResponseRecord | ResponseRecord
  permissions: {
    isCreator: boolean
    isAssignee: boolean
    canEdit: boolean
    canDelete: boolean
    canAssign: boolean
  }
  metadata: {
    statuses: Array<{ value: string; label: string }>
    labels: Array<{ value: string; label: string }>
    priorities: Array<{ value: string; label: string }>
    users: Array<{ id: string; username: string; email: string }>
    parentTasks: Array<{ id: string; title: string; task_status_id: string | null }>
    projects: Array<{ id: string; name: string }>
  }
}

export function mapTaskCreateApiBody(task: SerializableResponseRecord | ResponseRecord) {
  return {
    success: true,
    data: serializeForResponse(task),
  }
}

export function mapTaskUpdateApiBody(task: SerializableResponseRecord | ResponseRecord) {
  return {
    success: true,
    task: serializeForResponse(task),
  }
}

export function mapTaskStatusApiBody(
  task: SerializableResponseRecord | ResponseRecord,
  message: string
) {
  return {
    success: true,
    message,
    task: serializeForResponse(task),
  }
}

export function mapTaskSortOrderApiBody(task: SerializableResponseRecord | ResponseRecord) {
  return {
    success: true,
    data: serializeForResponse(task),
  }
}

export function mapTaskDetailPageProps(result: TaskDetailPageResult) {
  return {
    task: serializeForResponse(result.task),
    permissions: result.permissions,
    auditLogs: result.auditLogs,
  }
}

export function mapTaskEditPageProps(result: TaskEditPageResult) {
  return {
    task: serializeForResponse(result.task),
    metadata: result.metadata,
    permissions: result.permissions,
  }
}
