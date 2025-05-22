import React from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

type TaskListHeaderProps = {
  isAllSelected: boolean
  onSelectAll: (checked: boolean) => void
}

export function TaskListHeader({
  isAllSelected,
  onSelectAll
}: TaskListHeaderProps) {
  return (
    <div className="flex items-center justify-between p-2 border-b">
      <div className="flex items-center space-x-2">
        <Checkbox 
          checked={isAllSelected}
          onCheckedChange={onSelectAll}
          aria-label="Select all tasks"
        />
        <span className="text-sm font-medium">Tất cả nhiệm vụ</span>
      </div>
    </div>
  )
} 