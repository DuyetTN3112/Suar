import React from 'react'
import { TaskFormBasicFields } from './create_task_form/basic_fields'
import { TaskFormMetadataFields } from './create_task_form/metadata_fields'
import { TaskFormDueDateField } from './create_task_form/due_date_field'

export interface CreateTaskFormProps {
  formData: {
    title: string
    description: string
    status_id: string
    priority_id: string
    label_id: string
    assigned_to: string
    due_date: string
  }
  setFormData: React.Dispatch<React.SetStateAction<{
    title: string
    description: string
    status_id: string
    priority_id: string
    label_id: string
    assigned_to: string
    due_date: string
  }>>
  errors: Record<string, string>
  statuses: Array<{ id: number; name: string }>
  priorities: Array<{ id: number; name: string }>
  labels: Array<{ id: number; name: string }>
  users: Array<{ id: number; first_name: string; last_name: string; full_name: string }>
}

export function CreateTaskForm({
  formData,
  setFormData,
  errors,
  statuses,
  priorities,
  labels,
  users
}: CreateTaskFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ 
        ...prev, 
        due_date: date.toISOString().split('T')[0]
      }))
    } else {
      setFormData(prev => ({ ...prev, due_date: '' }))
    }
  }

  return (
    <div className="grid gap-4 py-4">
      <TaskFormBasicFields 
        formData={formData}
        handleChange={handleChange}
        errors={errors}
      />
      
      <TaskFormMetadataFields
        formData={formData}
        handleSelectChange={handleSelectChange}
        errors={errors}
        statuses={statuses}
        priorities={priorities}
        labels={labels}
        users={users}
      />
      
      <TaskFormDueDateField
        dueDate={formData.due_date ? new Date(formData.due_date) : undefined}
        onDateChange={handleDateChange}
        error={errors.due_date}
      />
    </div>
  )
} 