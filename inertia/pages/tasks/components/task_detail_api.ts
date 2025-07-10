import axios from 'axios'
import type { Task } from '../types.svelte'
import type { AuditLog } from './task_detail_types'

interface AuditLogsResponse {
  data?: AuditLog[]
}

interface TaskCompletionStatus {
  value: string
  label: string
  color: string
}

/**
 * Tải lịch sử thay đổi của task
 */
export const loadAuditLogs = async (taskId: string): Promise<AuditLog[]> => {
  try {
    const response = await axios.get<AuditLogsResponse>(`/api/tasks/${taskId}/audit-logs`)
    return response.data.data ?? []
  } catch (error: unknown) {
    console.error('Không thể tải lịch sử thay đổi:', error)
    return []
  }
}

/**
 * Đánh dấu task hoàn thành
 */
export const markTaskAsCompleted = (
  task: Task,
  statuses: TaskCompletionStatus[]
): string | null => {
  if (!task.id) return null

  // Tìm trạng thái hoàn thành
  const completedStatus = statuses.find(
    (status) =>
      status.value.toLowerCase().includes('done') ||
      status.label.toLowerCase().includes('complete') ||
      status.label.toLowerCase().includes('hoàn thành')
  )

  if (!completedStatus) {
    const doneStatus = statuses.find((status) => status.value.toLowerCase() === 'done')
    if (doneStatus) {
      return doneStatus.value
    }
    console.error('Không tìm thấy trạng thái hoàn thành')
    return null
  }

  return completedStatus.value
}
