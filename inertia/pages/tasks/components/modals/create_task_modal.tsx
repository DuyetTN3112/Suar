import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { router } from '@inertiajs/react'
import { CreateTaskForm } from './create_task_form'
import useTranslation from '@/hooks/use_translation'

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  statuses: Array<{ id: number; name: string }>
  priorities: Array<{ id: number; name: string }>
  labels: Array<{ id: number; name: string }>
  users?: Array<{ id: number; username: string; email: string }>
}

export function CreateTaskModal({
  open,
  onOpenChange,
  statuses = [],
  priorities = [],
  labels = [],
  users = [],
}: CreateTaskModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status_id: '',
    priority_id: '',
    label_id: '',
    assigned_to: '',
    due_date: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = () => {
    // Validate form
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = t('task.title') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (!formData.status_id) {
      newErrors.status_id = t('task.status') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)

    router.post('/tasks', formData, {
      onSuccess: () => {
        setSubmitting(false)
        onOpenChange(false)
        resetForm()
      },
      onError: (errors) => {
        setSubmitting(false)
        setErrors(errors)
      }
    })
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status_id: '',
      priority_id: '',
      label_id: '',
      assigned_to: '',
      due_date: ''
    })
    setErrors({})
  }

  const handleClose = () => {
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{t('task.new_task', {}, 'Tạo nhiệm vụ mới')}</DialogTitle>
          <DialogDescription>
            {t('task.add_task_description', {}, 'Thêm nhiệm vụ mới bằng cách điền thông tin bên dưới.')}
          </DialogDescription>
        </DialogHeader>

        <CreateTaskForm
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          statuses={statuses}
          priorities={priorities}
          labels={labels}
          users={users}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            {t('common.cancel', {}, 'Hủy')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? t('common.creating', {}, 'Đang tạo...') : t('task.add_task', {}, 'Tạo nhiệm vụ')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
