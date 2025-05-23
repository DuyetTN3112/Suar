import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import useTranslation from '@/hooks/use_translation'

interface TaskFormBasicFieldsProps {
  formData: {
    title: string
    description: string
  }
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  errors: Record<string, string>
}

export function TaskFormBasicFields({
  formData,
  handleChange,
  errors
}: TaskFormBasicFieldsProps) {
  const { t } = useTranslation()
  
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="title">{t('task.title', {}, 'Tiêu đề')}</Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder={t('task.enter_title', {}, 'Nhập tiêu đề nhiệm vụ')}
          className={errors.title ? 'border-red-500' : ''}
          autoFocus
        />
        {errors.title && (
          <p className="text-xs text-red-500">{errors.title}</p>
        )}
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="description">{t('task.description', {}, 'Mô tả')}</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder={t('task.enter_description', {}, 'Nhập mô tả chi tiết cho nhiệm vụ này')}
          rows={3}
        />
      </div>
    </>
  )
} 