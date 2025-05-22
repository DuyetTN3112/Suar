import React from 'react'
import { Clock } from 'lucide-react'

interface DateCellProps {
  createdAt?: string
  formatDate: (dateString: string) => string
}

export function DateCell({ createdAt, formatDate }: DateCellProps) {
  return (
    <div className="flex items-center gap-1">
      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      {createdAt ? (
        <span className="text-[11px]">{formatDate(createdAt)}</span>
      ) : (
        <span className="text-[11px] text-muted-foreground">-</span>
      )}
    </div>
  )
} 