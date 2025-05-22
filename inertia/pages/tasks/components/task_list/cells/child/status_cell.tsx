import React from 'react'

interface StatusCellProps {
  status?: any
  statusName: string
}

export function StatusCell({ status, statusName }: StatusCellProps) {
  return (
    <div className="text-[11px] inline-flex items-center whitespace-nowrap font-medium"
      style={{ 
        color: 
              statusName.includes('done') || statusName.includes('hoàn thành') ? 'rgb(34, 197, 94)' : // Xanh lá
              statusName.includes('progress') || statusName.includes('đang') ? 'rgb(59, 130, 246)' : // Xanh biển
              statusName.includes('pending') || statusName.includes('chờ') ? 'rgb(249, 115, 22)' : // Cam
              statusName.includes('todo') || statusName.includes('cần') ? 'rgb(100, 116, 139)' : // Xám
              status?.color || 'currentColor'
      }}>
      <span className="h-1.5 w-1.5 rounded-full mr-1" 
        style={{ 
          backgroundColor: 
              statusName.includes('done') || statusName.includes('hoàn thành') ? 'rgb(34, 197, 94)' : // Xanh lá
              statusName.includes('progress') || statusName.includes('đang') ? 'rgb(59, 130, 246)' : // Xanh biển
              statusName.includes('pending') || statusName.includes('chờ') ? 'rgb(249, 115, 22)' : // Cam
              statusName.includes('todo') || statusName.includes('cần') ? 'rgb(100, 116, 139)' : // Xám
              status?.color || 'currentColor'
        }}></span>
      {status?.name}
    </div>
  )
} 