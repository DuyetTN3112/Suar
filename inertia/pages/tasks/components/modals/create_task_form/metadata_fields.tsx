import React from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import useTranslation from '@/hooks/use_translation'

interface TaskFormMetadataFieldsProps {
  formData: {
    status_id: string
    priority_id: string
    label_id: string
    assigned_to: string
  }
  handleSelectChange: (name: string, value: string) => void
  errors: Record<string, string>
  statuses: Array<{ id: number; name: string }>
  priorities: Array<{ id: number; name: string }>
  labels: Array<{ id: number; name: string }>
  users: Array<{ id: number; username: string; email: string }>
}

export function TaskFormMetadataFields({
  formData,
  handleSelectChange,
  errors,
  statuses,
  priorities,
  labels,
  users
}: TaskFormMetadataFieldsProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="status_id">{t('task.status', {}, 'Trạng thái')}</Label>
          <Select
            value={formData.status_id}
            onValueChange={(value) => handleSelectChange('status_id', value)}
          >
            <SelectTrigger id="status_id">
              <SelectValue placeholder={t('task.select_status', {}, 'Chọn trạng thái')} />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={String(status.id)}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status_id && (
            <p className="text-xs text-red-500">{errors.status_id}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="priority_id">{t('task.priority', {}, 'Mức độ ưu tiên')}</Label>
          <Select
            value={formData.priority_id}
            onValueChange={(value) => handleSelectChange('priority_id', value)}
          >
            <SelectTrigger id="priority_id">
              <SelectValue placeholder={t('task.select_priority', {}, 'Chọn mức độ ưu tiên')} />
            </SelectTrigger>
            <SelectContent>
              {priorities.map((priority) => (
                <SelectItem key={priority.id} value={String(priority.id)}>
                  {priority.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.priority_id && (
            <p className="text-xs text-red-500">{errors.priority_id}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="label_id">{t('task.label', {}, 'Nhãn')}</Label>
          <Select
            value={formData.label_id}
            onValueChange={(value) => handleSelectChange('label_id', value)}
          >
            <SelectTrigger id="label_id">
              <SelectValue placeholder={t('task.select_label', {}, 'Chọn nhãn')} />
            </SelectTrigger>
            <SelectContent>
              {labels.map((label) => (
                <SelectItem key={label.id} value={String(label.id)}>
                  {label.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.label_id && (
            <p className="text-xs text-red-500">{errors.label_id}</p>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="assigned_to">{t('task.assigned_to', {}, 'Người thực hiện')}</Label>
        <Select
          value={formData.assigned_to}
          onValueChange={(value) => handleSelectChange('assigned_to', value)}
        >
          <SelectTrigger id="assigned_to">
            <SelectValue placeholder={t('task.select_assignee_short', {}, 'Phân công cho')} />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={String(user.id)}>
                {user.username || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
