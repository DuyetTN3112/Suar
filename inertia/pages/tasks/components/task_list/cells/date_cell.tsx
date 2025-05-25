
import type { Task } from '../../../types'
import { Clock } from 'lucide-react'

interface TaskDateCellProps {
  task: Task
  formatDate: (dateString: string) => string
}

export function TaskDateCell({ task, formatDate }: TaskDateCellProps) {
  return (
    <div className="flex items-center gap-1">
      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      {task.created_at ? (
        <span className="text-[11px]">{formatDate(task.created_at)}</span>
      ) : (
        <span className="text-[11px] text-muted-foreground">-</span>
      )}
    </div>
  )
}
