import React from 'react'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Task } from '../../../types'
import { getAvatarInitials, formatDate } from '../../task_detail_utils'

interface TaskCreatorInfoProps {
  task: Task
}

export function TaskCreatorInfo({ task }: TaskCreatorInfoProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="grid gap-2">
        <Label>Người tạo</Label>
        <div className="p-2 border rounded-md flex items-center gap-2">
          {task.creator ? (
            <>
              <Avatar className="h-7 w-7">
                <AvatarFallback>
                  {task.creator.username?.[0]?.toUpperCase() || task.creator.email?.[0]?.toUpperCase() || 'NA'}
                </AvatarFallback>
              </Avatar>
              <span>{task.creator.username || task.creator.email}</span>
            </>
          ) : (
            <span>Không xác định</span>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Ngày tạo</Label>
        <div className="p-2 border rounded-md">
          {formatDate(task.created_at)}
        </div>
      </div>
    </div>
  )
}
