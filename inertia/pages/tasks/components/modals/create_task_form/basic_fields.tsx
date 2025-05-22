import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="title">Tiêu đề</Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Nhập tiêu đề nhiệm vụ"
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
          value={formData.description}
          onChange={handleChange}
          placeholder="Mô tả chi tiết về nhiệm vụ"
          rows={3}
        />
        {errors.description && (
          <p className="text-xs text-red-500">{errors.description}</p>
        )}
      </div>
    </>
  )
} 