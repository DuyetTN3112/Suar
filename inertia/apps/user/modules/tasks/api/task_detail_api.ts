import axios from 'axios'

import { ApiResponseContractError } from '@/apps/shared/http/api_problem.js'
import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte.js'
import type { AuditLog } from '@/apps/user/modules/tasks/types/task_detail_types.js'

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
  impact_scope?: string
  tech_stack?: string[]
  domain_tags?: string[]
  learning_objectives?: string[]
  measurable_outcomes?: Array<{ title: string; description?: string }>
  environment?: string
  collaboration_type?: string
  complexity_notes?: string
  role_in_task?: string
  autonomy_level?: string
  problem_category?: string
  business_domain?: string
  estimated_users_affected?: number
  authoring?: Record<string, unknown>
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
  const response = await axios.get<AuditLogsResponse>(`/api/v1/tasks/${taskId}/audit-logs`)
  if (!Array.isArray(response.data.data)) {
    throw new ApiResponseContractError()
  }

  return response.data.data
}

/**
 * Load full task detail for the detail panel.
 */
export const loadTaskDetail = async (taskId: string): Promise<TaskDetail> => {
  const response = await axios.get<TaskDetailResponse>(`/api/v1/tasks/${taskId}`)
  if (!response.data.data) {
    throw new ApiResponseContractError()
  }

  return response.data.data
}

/** Update the editable task fields from its project board detail panel. */
export const updateTaskDetail = async (
  taskId: string,
  payload: TaskDetailUpdatePayload
): Promise<TaskDetail> => {
  const response = await axios.put<TaskDetailResponse>(`/tasks/${taskId}`, payload)
  if (!response.data.data) {
    throw new ApiResponseContractError()
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
