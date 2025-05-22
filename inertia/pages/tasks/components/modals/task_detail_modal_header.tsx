import React from 'react'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Task } from '../../types'

type TaskDetailModalHeaderProps = {
  task: Task
}

export function TaskDetailModalHeader({ task }: TaskDetailModalHeaderProps) {
  return (
    <DialogHeader className="flex flex-row items-center">
      <div className="flex-1">
        <DialogTitle className="text-xl flex items-center gap-2">
          {task.status && (
            <span 
              className="inline-block w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: task.status.color }}
            ></span>
          )}
          {task.id}: {task.title}
        </DialogTitle>
      </div>
    </DialogHeader>
  )
} 