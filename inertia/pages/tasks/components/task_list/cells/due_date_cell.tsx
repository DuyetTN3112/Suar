import React from 'react'
import { Task } from '../../../types'
import { CalendarIcon } from 'lucide-react'

interface TaskDueDateCellProps {
  task: Task
  formatDate: (dateString: string) => string
}

export function TaskDueDateCell({ task, formatDate }: TaskDueDateCellProps) {
  return (
    <div className="flex items-center gap-1">
      <CalendarIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      {task.due_date ? (
        <span className={`text-[11px] font-medium ${
          // Đơn giản hóa logic màu sắc
          new Date(task.due_date) < new Date() ? 'text-red-600' : // Quá hạn: Đỏ
          'text-violet-500' // Mặc định: Tím
        }`}>{formatDate(task.due_date)}</span>
      ) : (
        <span className="text-[11px] text-slate-500">-</span> // Không có hạn: Xám
      )}
    </div>
  )
} 