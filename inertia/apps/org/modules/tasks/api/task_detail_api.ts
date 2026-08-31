import axios from 'axios'

import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte.js'
import type { AuditLog } from '@/apps/org/modules/tasks/types/task_detail_types.js'

interface AuditLogsResponse {
  data?: AuditLog[]
}

interface TaskDetailResponse {
  data?: TaskDetail
}

export interface TaskDetailUpdatePayload {
  title?: string
  description?: string
  priority?: string | null
  label?: string | null
  assigned_to?: string | null
  due_date?: string | null
  estimated_time?: number
  actual_time?: number
  task_visibility?: 'project' | 'internal' | 'external' | 'all'
  task_type?: string
  acceptance_criteria?: string
  verification_method?: string
  expected_deliverables?: Array<{ title: string; description?: string }>
  context_background?: string
  tech_stack?: string[]
  domain_tags?: string[]
  environment?: string
  collaboration_type?: string
  complexity_notes?: string
  role_in_task?: string
  autonomy_level?: string
  problem_category?: string
  business_domain?: string
  estimated_users_affected?: number
}

interface TaskCompletionStatus {
  value: string
  label: string
  color: string
}

function normalizeStatusText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Load task audit logs.
 */
export const loadAuditLogs = async (taskId: string): Promise<AuditLog[]> => {
  try {
    const response = await axios.get<AuditLogsResponse>(`/api/v1/tasks/${taskId}/audit-logs`)
    return response.data.data ?? []
  } catch (error: unknown) {
    console.error('Unable to load audit logs:', error)
    return []
  }
}

/**
 * Load full task detail for the detail panel.
 */
export const loadTaskDetail = async (taskId: string): Promise<TaskDetail | null> => {
  try {
    const response = await axios.get<TaskDetailResponse>(`/api/v1/tasks/${taskId}`)
    return response.data.data ?? null
  } catch (error: unknown) {
    console.error('Unable to load task detail:', error)
    return null
  }
}

/** Update the editable task fields from its project board detail panel. */
export const updateTaskDetail = async (
  taskId: string,
  payload: TaskDetailUpdatePayload
): Promise<TaskDetail> => {
  const response = await axios.put<TaskDetailResponse>(`/tasks/${taskId}`, payload)
  if (!response.data.data) {
    throw new Error('Task update response did not contain a task')
  }

  return response.data.data
}

/**
 * Mark task as completed.
 */
export const markTaskAsCompleted = (
  task: TaskDetail,
  statuses: TaskCompletionStatus[]
): string | null => {
  if (!task.id) return null

  const completedStatus = statuses.find((status) => {
    const value = normalizeStatusText(status.value)
    const label = normalizeStatusText(status.label)

    return value.includes('done') || label.includes('complete') || label.includes('hoan thanh')
  })

  if (!completedStatus) {
    const doneStatus = statuses.find((status) => status.value.toLowerCase() === 'done')
    if (doneStatus) {
      return doneStatus.value
    }
    console.error('Unable to find a completed status')
    return null
  }

  return completedStatus.value
}
