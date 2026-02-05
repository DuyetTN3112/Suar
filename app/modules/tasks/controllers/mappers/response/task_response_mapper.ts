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
    statuses: { value: string; label: string }[]
    labels: { value: string; label: string }[]
    priorities: { value: string; label: string }[]
    users: { id: string; username: string; email: string }[]
    parentTasks: { id: string; title: string; task_status_id: string | null }[]
    projects: { id: string; name: string }[]
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
