import React from 'react'
import { formatDate } from '../../../utils/task_formatter'
import { Task } from '../../../types'

interface TaskDetailHistoryTabProps {
  auditLogs: Array<{
    id: number
    action: string
    user?: {
      id: number
      name: string
    }
    created_at: string
    old_values?: any
    new_values?: any
  }>
  task: Task | null
}

export function TaskDetailHistoryTab({ auditLogs, task }: TaskDetailHistoryTabProps) {
  if (!auditLogs || auditLogs.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Không có lịch sử thay đổi
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-medium mb-2">Lịch sử thay đổi</h3>
      
      <div className="space-y-3">
        {auditLogs.map((log) => (
          <div key={log.id} className="border rounded-md p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span className="font-medium">
                {log.user ? log.user.name : 'Hệ thống'}
              </span>
              <span className="text-gray-500">
                {formatDate(log.created_at)}
              </span>
            </div>
            
            <div className="text-gray-600">
              {getActionDescription(log.action, log.old_values, log.new_values)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper function để hiển thị mô tả hành động
function getActionDescription(action: string, oldValues?: any, newValues?: any): string {
  switch (action) {
    case 'created':
      return 'Đã tạo nhiệm vụ'
    case 'updated':
      return 'Đã cập nhật nhiệm vụ'
    case 'deleted':
      return 'Đã xóa nhiệm vụ'
    case 'status_changed':
      return `Đã thay đổi trạng thái từ "${oldValues?.status_name || 'N/A'}" thành "${newValues?.status_name || 'N/A'}"`
    case 'assigned':
      return `Đã giao nhiệm vụ cho ${newValues?.assigned_to_name || 'N/A'}`
    default:
      return 'Đã thực hiện thay đổi'
  }
} 