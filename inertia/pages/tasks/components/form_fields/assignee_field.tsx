import React from 'react'
import { Task } from '../../types'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAvatarInitials } from '../task_detail_utils'

interface AssigneeFieldProps {
  formData: Partial<Task>
  handleSelectChange: (name: string, value: string) => void
  canEdit: boolean
  users: Array<{ id: number; first_name: string; last_name: string; full_name: string; avatar?: string }>
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
                    <AvatarImage src={user.avatar || ''} alt={user.full_name} />
                    <AvatarFallback>{user.full_name ? getAvatarInitials(user.full_name) : ''}</AvatarFallback>
                  </Avatar>
                  <span className="ml-2">{user.full_name}</span>
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
                <AvatarImage src={task.assignee.avatar || ''} alt={task.assignee.full_name} />
                <AvatarFallback>{task.assignee.full_name ? getAvatarInitials(task.assignee.full_name) : ''}</AvatarFallback>
              </Avatar>
              <span className="ml-2">{task.assignee.full_name}</span>
            </>
          ) : (
            "Không xác định"
          )}
        </div>
      )}
    </div>
  )
} 