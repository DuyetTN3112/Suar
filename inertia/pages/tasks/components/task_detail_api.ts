import axios from 'axios'
import { Task } from '../types'
import { AuditLog } from './task_detail_types'

/**
 * Tải lịch sử thay đổi của task
 */
export const loadAuditLogs = async (taskId: number): Promise<AuditLog[]> => {
  try {
    const response = await axios.get(`/api/tasks/${taskId}/audit-logs`)
    return response.data.data || []
  } catch (error) {
    console.error('Không thể tải lịch sử thay đổi:', error)
    return []
  }
}

/**
 * Đánh dấu task hoàn thành
 */
export const markTaskAsCompleted = async (
  task: Task,
  statuses: Array<{ id: number; name: string; color: string }>
): Promise<number | null> => {
  if (!task?.id) return null

  const completedStatusId = statuses.find(
    (status) =>
      status.name.toLowerCase().includes('done') ||
      status.name.toLowerCase().includes('complete') ||
      status.name.toLowerCase().includes('hoàn thành')
  )?.id

  if (!completedStatusId) {
    console.error('Không tìm thấy trạng thái hoàn thành')
    return null
  }

  return completedStatusId
}
