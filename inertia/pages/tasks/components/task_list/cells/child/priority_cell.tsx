import React from 'react'

interface PriorityCellProps {
  priority?: any
  priorityName: string
}

export function PriorityCell({ priority, priorityName }: PriorityCellProps) {
  return (
    <div className="text-[11px] inline-flex items-center whitespace-nowrap font-medium"
      style={{ 
        color: 
            priorityName.includes('urgent') || priorityName.includes('khẩn') ? 'rgb(220, 38, 38)' : // Đỏ
            priorityName.includes('high') || priorityName.includes('cao') ? 'rgb(249, 115, 22)' : // Cam
            priorityName.includes('medium') || priorityName.includes('trung') ? 'rgb(139, 92, 246)' : // Tím
            priorityName.includes('low') || priorityName.includes('thấp') ? 'rgb(34, 197, 94)' : // Xanh lá
            priority?.color || 'currentColor'
      }}>
      <span className="h-1.5 w-1.5 rounded-full mr-1" 
        style={{ 
          backgroundColor: 
            priorityName.includes('urgent') || priorityName.includes('khẩn') ? 'rgb(220, 38, 38)' : // Đỏ
            priorityName.includes('high') || priorityName.includes('cao') ? 'rgb(249, 115, 22)' : // Cam
            priorityName.includes('medium') || priorityName.includes('trung') ? 'rgb(139, 92, 246)' : // Tím
            priorityName.includes('low') || priorityName.includes('thấp') ? 'rgb(34, 197, 94)' : // Xanh lá
            priority?.color || 'currentColor'
        }}></span>
      {priority?.name}
    </div>
  )
} 