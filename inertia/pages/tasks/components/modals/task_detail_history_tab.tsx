
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { History } from 'lucide-react'
import type { Task } from '../../types'

interface AuditLogEntry {
  id: number
  user_type: string
  user_id: number
  event: string
  auditable_type: string
  auditable_id: number
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  tags?: string[]
  created_at: string
  updated_at: string
  user?: {
    id: number
    username: string
    email: string
  }
}

interface TaskDetailHistoryTabProps {
  auditLogs: AuditLogEntry[]
  task: Task | null
}

export function TaskDetailHistoryTab({ auditLogs, task }: TaskDetailHistoryTabProps) {
  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: vi })
    } catch (error) {
      return dateString
    }
  }

  const getFieldNameInVietnamese = (fieldName: string): string => {
    const fieldNameMap: Record<string, string> = {
      title: 'Tiêu đề',
      description: 'Mô tả',
      status_id: 'Trạng thái',
      priority_id: 'Độ ưu tiên',
      label_id: 'Nhãn',
      assigned_to: 'Người được giao',
      due_date: 'Ngày đến hạn',
      completed_at: 'Ngày hoàn thành',
      deleted_at: 'Ngày xóa',
      parent_task_id: 'Nhiệm vụ cha',
    }

    return fieldNameMap[fieldName] || fieldName
  }

  const getStatusName = (statusId: number): string => {
    const status = task?.status
    if (status && status.id === statusId) {
      return status.name
    }
    return `Trạng thái #${statusId}`
  }

  const getPriorityName = (priorityId: number): string => {
    const priority = task?.priority
    if (priority && priority.id === priorityId) {
      return priority.name
    }
    return `Độ ưu tiên #${priorityId}`
  }

  const getUserName = (userId: number): string => {
    if (!userId) return 'Không có'
    if (task?.assignee && task.assignee.id === userId) {
      return task.assignee.username || task.assignee.email
    }
    return `Người dùng #${userId}`
  }

  const getValueText = (fieldName: string, value: unknown): string => {
    if (value === null || value === undefined) return 'Không có'

    switch (fieldName) {
      case 'status_id':
        return getStatusName(value)
      case 'priority_id':
        return getPriorityName(value)
      case 'assigned_to':
        return getUserName(value)
      case 'due_date':
        return value ? formatDate(value) : 'Không có'
      default:
        return String(value)
    }
  }

  return (
    <div className="space-y-4 py-4">
      <h3 className="text-sm font-medium">Lịch sử thay đổi</h3>

      {auditLogs.length === 0 && (
        <div className="text-center text-muted-foreground py-4">
          Không có lịch sử thay đổi
        </div>
      )}

      {auditLogs.map((log) => (
        <Card key={log.id} className="mb-2">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <History className="h-4 w-4 text-muted-foreground mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {log.user?.username || log.user?.email || 'Người dùng không xác định'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(log.created_at)}
                  </span>
                </div>

                <p className="text-sm mt-1">
                  {log.event === 'created' && 'đã tạo nhiệm vụ này'}
                  {log.event === 'updated' && 'đã cập nhật nhiệm vụ này'}
                  {log.event === 'deleted' && 'đã xóa nhiệm vụ này'}
                </p>

                {log.event === 'updated' && log.old_values && log.new_values && (
                  <div className="mt-2 space-y-2">
                    {Object.keys(log.new_values).map(key => (
                      <div key={key} className="text-xs">
                        <span className="font-medium">{getFieldNameInVietnamese(key)}: </span>
                        <span className="text-muted-foreground line-through mr-1">
                          {getValueText(key, log.old_values?.[key])}
                        </span>
                        <span className="text-primary">
                          → {getValueText(key, log.new_values?.[key])}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
