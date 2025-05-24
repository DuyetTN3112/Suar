import React, { useEffect } from 'react'
import { TaskDetailFields } from './task_detail_fields'
import { TaskDetailActions } from './task_detail_actions'
import { Task } from '../../../types'
import { useTaskDetailForm } from './hooks/use_task_detail_form'
import { formatDate } from '../../../utils/task_formatter'
import { getAvatarInitials } from '../../task_detail_utils'
import { Calendar, User } from 'lucide-react'
import useTranslation from '@/hooks/use_translation'

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
  const { t } = useTranslation()
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

  // Tìm thông tin người tạo từ danh sách users
  const creator = users.find(user => Number(user.id) === Number(task.created_by));

  // Lấy tên đầy đủ của người tạo
  const getCreatorFullName = () => {
    if (task.creator) {
      // Trường hợp có thông tin creator từ API
      return task.creator.full_name ||
             task.creator.full_name ||
             `${task.creator.first_name || task.creator.first_name || ''} ${task.creator.last_name || task.creator.last_name || ''}`.trim();
    } else if (creator) {
      // Trường hợp tìm được creator từ danh sách users
      return creator.full_name || `${creator.first_name} ${creator.last_name}`.trim();
    }
    return t('task.no_creator_info', {}, 'Không có thông tin');
  };

  // Lấy initials cho avatar
  const getCreatorInitials = () => {
    if (task.creator) {
      const fullName = task.creator.full_name || task.creator.full_name ||
                       `${task.creator.first_name || task.creator.first_name || ''} ${task.creator.last_name || task.creator.last_name || ''}`.trim();
      return getAvatarInitials(fullName);
    } else if (creator) {
      return getAvatarInitials(creator.full_name || `${creator.first_name} ${creator.last_name}`);
    }
    return 'U';
  };



  return (
    <div className="space-y-6">
      {/* Thông tin người tạo và ngày tạo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Người tạo */}
        <div className="bg-muted/30 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <User className="h-4 w-4 mr-2 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">{t('task.created_by', {}, 'Người tạo')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs">
              {getCreatorInitials()}
            </div>
            <span className="text-sm font-medium">
              {getCreatorFullName()}
            </span>
          </div>
        </div>

        {/* Ngày tạo */}
        <div className="bg-muted/30 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">{t('task.created_at', {}, 'Ngày tạo')}</p>
          </div>
          <p className="text-sm">{formatDate(task.created_at)}</p>
        </div>
      </div>

      {/* Fields chính của task */}
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
    </div>
  )
}
