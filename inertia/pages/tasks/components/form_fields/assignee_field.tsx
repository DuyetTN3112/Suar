import React from 'react'
import type { Task } from '../../types'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'


interface AssigneeFieldProps {
  formData: Partial<Task>
  handleSelectChange: (name: string, value: string) => void
  canEdit: boolean
  users: Array<{ id: number; username: string; email: string }>
  task: Task
}

export const AssigneeField: React.FC<AssigneeFieldProps> = ({
  formData, handleSelectChange, canEdit, users, task
}) => {
  return (
    <div className="grid gap-2">
      <Label htmlFor="assigned_to">Người được giao</Label>
      {canEdit ? (
        <Select
          value={String(formData.assigned_to || '')}
          onValueChange={(value) => handleSelectChange('assigned_to', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn người được giao" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={String(user.id)}>
                <div className="flex items-center">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback>{user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="ml-2">{user.username || user.email}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="p-2 border rounded-md flex items-center">
          {task.assignee ? (
            <>
              <Avatar className="h-7 w-7">
                <AvatarFallback>
                  {task.assignee.username?.[0]?.toUpperCase() || task.assignee.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="ml-2">{task.assignee.username || task.assignee.email}</span>
            </>
          ) : (
            "Không xác định"
          )}
        </div>
      )}
    </div>
  )
}
