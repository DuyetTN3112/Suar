import React from 'react'
import { TaskDetailFields } from './task_detail_fields'
import { TaskDetailActions } from './task_detail_actions'
import { Task } from '../../../types'
import { useTaskDetailForm } from './hooks/use_task_detail_form'

export interface TaskDetailInfoTabProps {
  task: Task
  formData: Partial<Task>
  setFormData: React.Dispatch<React.SetStateAction<Partial<Task>>>
  isEditing: boolean
  errors: Record<string, string>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  statuses: Array<{ id: number; name: string; color: string }>
  priorities: Array<{ id: number; name: string; color: string; value: number }>
  labels: Array<{ id: number; name: string; color: string }>
  users: Array<{ id: number; first_name: string; last_name: string; full_name: string; avatar?: string }>
  submitting: boolean
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>
  onUpdate?: (updatedTask: Task) => void
  canMarkAsCompleted?: boolean
  canDelete?: boolean
  completedStatusId?: number
}

export function TaskDetailInfoTab({
  task,
  formData,
  setFormData,
  isEditing,
  errors,
  setErrors,
  statuses,
  priorities,
  labels,
  users,
  submitting,
  setSubmitting,
  onUpdate,
  canMarkAsCompleted = false,
  canDelete = false,
  completedStatusId
}: TaskDetailInfoTabProps) {
  const {
    handleChange,
    handleSelectChange,
    handleDateChange,
    handleSubmit
  } = useTaskDetailForm({
    task,
    formData,
    setFormData,
    isEditing,
    errors,
    setErrors,
    submitting,
    setSubmitting,
    onUpdate
  });
  
  return (
    <div className="grid gap-4 py-4">
      <TaskDetailFields 
        task={task}
        formData={formData}
        isEditing={isEditing}
        errors={errors}
        statuses={statuses}
        priorities={priorities}
        labels={labels}
        users={users}
        handleChange={handleChange}
        handleSelectChange={handleSelectChange}
        handleDateChange={handleDateChange}
      />
      
      {isEditing && (
        <TaskDetailActions 
          task={task}
          formData={formData}
          submitting={submitting}
          setSubmitting={setSubmitting}
          setErrors={setErrors}
          onUpdate={onUpdate}
          onSubmit={handleSubmit}
          canMarkAsCompleted={canMarkAsCompleted}
          canDelete={canDelete}
          completedStatusId={completedStatusId}
        />
      )}
    </div>
  )
} 