import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Task } from '../../../types'
import { DatePicker } from '@/components/ui/date-picker'

interface TaskDetailFieldsProps {
  task: Task
  formData: Partial<Task>
  isEditing: boolean
  errors: Record<string, string>
  statuses: Array<{ id: number; name: string; color: string }>
  priorities: Array<{ id: number; name: string; color: string; value: number }>
  labels: Array<{ id: number; name: string; color: string }>
  users: Array<{ id: number; first_name: string; last_name: string; full_name: string; avatar?: string }>
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleSelectChange: (name: string, value: string) => void
  handleDateChange: (date: Date | undefined) => void
}

export function TaskDetailFields({
  task,
  formData,
  isEditing,
  errors,
  statuses,
  priorities,
  labels,
  users,
  handleChange,
  handleSelectChange,
  handleDateChange
}: TaskDetailFieldsProps) {
  // Format lại ngày hạn để hiển thị trong DatePicker
  const dueDate = formData.due_date ? new Date(formData.due_date) : undefined
  
  return (
    <div className="grid gap-4">
      {/* Tiêu đề */}
      <div className="space-y-2">
        <Label htmlFor="title">Tiêu đề</Label>
        <Input
          id="title"
          name="title"
          value={formData.title || ''}
          onChange={handleChange}
          placeholder="Nhập tiêu đề nhiệm vụ"
          disabled={!isEditing}
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && (
          <p className="text-xs text-red-500">{errors.title}</p>
        )}
      </div>
      
      {/* Mô tả */}
      <div className="space-y-2">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          placeholder="Mô tả chi tiết về nhiệm vụ"
          rows={4}
          disabled={!isEditing}
        />
      </div>
      
      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status_id">Trạng thái</Label>
        <Select
          disabled={!isEditing}
          value={String(formData.status_id || '')}
          onValueChange={(value) => handleSelectChange('status_id', value)}
        >
          <SelectTrigger id="status_id" className={errors.status_id ? 'border-red-500' : ''}>
            <SelectValue placeholder="Chọn trạng thái" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status.id} value={String(status.id)}>
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: status.color || '#888' }}
                  ></div>
                  {status.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.status_id && (
          <p className="text-xs text-red-500">{errors.status_id}</p>
        )}
      </div>
      
      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority_id">Độ ưu tiên</Label>
        <Select
          disabled={!isEditing}
          value={String(formData.priority_id || '')}
          onValueChange={(value) => handleSelectChange('priority_id', value)}
        >
          <SelectTrigger id="priority_id">
            <SelectValue placeholder="Chọn độ ưu tiên" />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((priority) => (
              <SelectItem key={priority.id} value={String(priority.id)}>
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: priority.color || '#888' }}
                  ></div>
                  {priority.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="label_id">Nhãn</Label>
        <Select
          disabled={!isEditing}
          value={String(formData.label_id || '')}
          onValueChange={(value) => handleSelectChange('label_id', value)}
        >
          <SelectTrigger id="label_id">
            <SelectValue placeholder="Chọn nhãn" />
          </SelectTrigger>
          <SelectContent>
            {labels.map((label) => (
              <SelectItem key={label.id} value={String(label.id)}>
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: label.color || '#888' }}
                  ></div>
                  {label.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Assigned To */}
      <div className="space-y-2">
        <Label htmlFor="assigned_to">Giao cho</Label>
        <Select
          disabled={!isEditing}
          value={String(formData.assigned_to || '')}
          onValueChange={(value) => handleSelectChange('assigned_to', value)}
        >
          <SelectTrigger id="assigned_to">
            <SelectValue placeholder="Chọn người thực hiện" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={String(user.id)}>
                {user.full_name || `${user.first_name} ${user.last_name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Due Date */}
      <div className="space-y-2">
        <Label htmlFor="due_date">Ngày hạn</Label>
        <DatePicker
          date={dueDate}
          onSelect={handleDateChange}
          disabled={!isEditing}
        />
      </div>
    </div>
  )
} 