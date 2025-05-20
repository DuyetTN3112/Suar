
import type { Task } from '../../../types'
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
          {task.assignee.username || task.assignee.email || `User #${task.assignee.id}`}
        </span>
      ) : (
        <span className="text-[11px] text-muted-foreground">Chưa gán</span>
      )}
    </div>
  )
}
