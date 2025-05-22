import React from 'react'
import { CalendarIcon } from 'lucide-react'

interface DueDateCellProps {
  dueDate?: string
  formatDate: (dateString: string) => string
}

export function DueDateCell({ dueDate, formatDate }: DueDateCellProps) {
  return (
    <div className="flex items-center gap-1">
      <CalendarIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      {dueDate ? (
        <span className={`text-[11px] font-medium ${
          // Đơn giản hóa logic màu sắc
          new Date(dueDate) < new Date() ? 'text-red-600' : // Quá hạn: Đỏ
          'text-violet-500' // Mặc định: Tím
        }`}>{formatDate(dueDate)}</span>
      ) : (
        <span className="text-[11px] text-slate-500">-</span> // Không có hạn: Xám
      )}
    </div>
  )
} 