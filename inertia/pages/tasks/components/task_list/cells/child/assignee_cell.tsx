
import { User } from 'lucide-react'

interface AssigneeCellProps {
  assignee?: unknown
}

export function AssigneeCell({ assignee }: AssigneeCellProps) {
  return (
    <div className="flex items-center gap-1">
      <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      {assignee ? (
        <span className="text-[11px] truncate">
          {assignee.username || assignee.email || 'Chưa gán'}
        </span>
      ) : (
        <span className="text-[11px] text-muted-foreground">Chưa gán</span>
      )}
    </div>
  )
}
