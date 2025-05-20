import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Task } from '../../types'
import { TaskCreatorInfo } from './info/task_creator_info'
import { TaskDueDateField } from './info/task_due_date_field'
import { StatusField, PriorityField, LabelField, AssigneeField } from '../task_form_fields'

export interface InfoTabProps {
  task: Task
  formData: Partial<Task>
  date: Date | undefined
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleSelectChange: (name: string, value: string) => void
  handleDateChange: (date: Date | undefined) => void
  errors: Record<string, string>
  isEditing: boolean
  canEdit: boolean
  statuses: Array<{ id: number; name: string; color: string }>
  priorities: Array<{ id: number; name: string; color: string; value: number }>
  labels: Array<{ id: number; name: string; color: string }>
  users: Array<{ id: number; username: string; email: string }>
}

export const InfoTab: React.FC<InfoTabProps> = ({
  task,
  formData,
  date,
  handleChange,
  handleSelectChange,
  handleDateChange,
  errors,
  isEditing,
  canEdit,
  statuses,
  priorities,
  labels,
  users
}) => {
  return (
    <div className="grid gap-4">
      <TaskCreatorInfo task={task} />

      <div className="grid gap-2">
        <Label htmlFor="title">Tiêu đề</Label>
        <Input
          id="title"
          name="title"
          value={formData.title || ''}
          onChange={handleChange}
          placeholder="Nhập tiêu đề nhiệm vụ"
          readOnly={!isEditing}
          className={!isEditing ? "opacity-80 cursor-not-allowed" : ""}
        />
        {errors.title && (
          <p className="text-xs text-red-500">{errors.title}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          placeholder="Nhập mô tả chi tiết về nhiệm vụ"
          rows={3}
          readOnly={!isEditing}
          className={!isEditing ? "opacity-80 cursor-not-allowed" : ""}
        />
        {errors.description && (
          <p className="text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatusField
          formData={formData}
          handleSelectChange={handleSelectChange}
          isEditing={isEditing}
          statuses={statuses}
          task={task}
        />

        <PriorityField
          formData={formData}
          handleSelectChange={handleSelectChange}
          canEdit={canEdit}
          priorities={priorities}
          task={task}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabelField
          formData={formData}
          handleSelectChange={handleSelectChange}
          canEdit={canEdit}
          labels={labels}
          task={task}
        />

        <AssigneeField
          formData={formData}
          handleSelectChange={handleSelectChange}
          canEdit={canEdit}
          users={users}
          task={task}
        />
      </div>

      <TaskDueDateField
        date={date}
        canEdit={canEdit}
        handleDateChange={handleDateChange}
      />
    </div>
  )
}
