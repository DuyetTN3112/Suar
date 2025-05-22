import React from 'react'
import { Task } from '../../../types'
import { User } from 'lucide-react'

interface TaskAssigneeCellProps {
  task: Task
}

export function TaskAssigneeCell({ task }: TaskAssigneeCellProps) {
  return (
    <div className="flex items-center gap-1">
      <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      {task.assignee ? (
        <span className="text-[11px] truncate">
          {task.assignee.full_name || 
          (task.assignee.first_name || task.assignee.last_name ? 
            `${task.assignee.first_name || ''} ${task.assignee.last_name || ''}`.trim() : 
            `Người dùng #${task.assignee.id}`)}
        </span>
      ) : (
        <span className="text-[11px] text-muted-foreground">Chưa gán</span>
      )}
    </div>
  )
} 