
import type { Task } from '../../../types'

interface TaskLabelCellProps {
  task: Task
}

export function TaskLabelCell({ task }: TaskLabelCellProps) {
  return (
    <>
      {task.label ? (
        <div className="text-[11px] inline-flex items-center whitespace-nowrap font-medium"
          style={{ color: task.label?.color || 'currentColor' }}>
          <span className="h-1.5 w-1.5 rounded-full mr-1"
            style={{ backgroundColor: task.label?.color || 'currentColor' }}></span>
          {task.label?.name}
        </div>
      ) : (
        <span className="text-[11px] text-muted-foreground">-</span>
      )}
    </>
  )
}
