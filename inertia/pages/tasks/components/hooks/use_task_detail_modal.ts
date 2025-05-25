import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import type { Task } from '../../types'
import { getPermissions } from '../task_detail_utils'
import { loadAuditLogs, markTaskAsCompleted } from '../task_detail_api'

type UseTaskDetailModalProps = {
  task: Task | null
  statuses: Array<{ id: number; name: string; color: string }>
  onUpdate?: (updatedTask: Task) => void
  currentUser: unknown
}

export function useTaskDetailModal({
  task,
  statuses,
  onUpdate,
  currentUser,
}: UseTaskDetailModalProps) {
  const [formData, setFormData] = useState<Partial<unknown>>({})
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [activeTab, setActiveTab] = useState('info')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [auditLogs, setAuditLogs] = useState<unknown[]>([])
  const [isEditing, setIsEditing] = useState(false)

  // Lấy thông tin task và cấu hình quyền
  useEffect(() => {
    if (task) {
      setIsEditing(true)
      setFormData({
        ...task,
      })
      if (task.due_date) {
        setDate(new Date(task.due_date))
      } else {
        setDate(undefined)
      }
      if (task.id) {
        void loadAuditLogs(task.id).then((logs) => setAuditLogs(logs))
      }
    }
  }, [task, currentUser])

  // Xác định quyền người dùng
  const { canEdit, canDelete, canMarkAsCompleted } = getPermissions(currentUser, task)

  // Xử lý sự kiện thay đổi input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!isEditing) return
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Xử lý sự kiện thay đổi select
  const handleSelectChange = (name: string, value: string) => {
    if (!isEditing) return
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Xử lý sự kiện thay đổi ngày
  const handleDateChange = (dateValue: Date | undefined) => {
    if (!isEditing) return
    setDate(dateValue)
    if (dateValue) {
      setFormData((prev) => ({
        ...prev,
        due_date: dateValue.toISOString().split('T')[0],
      }))
      if (errors.due_date) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.due_date
          return newErrors
        })
      }
    } else {
      setFormData((prev) => ({ ...prev, due_date: '' }))
    }
  }

  // Xử lý sự kiện submit form
  const handleSubmit = () => {
    if (!task?.id) return
    const newErrors: Record<string, string> = {}
    if (!formData.title?.trim()) {
      newErrors.title = 'Tiêu đề là bắt buộc'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setSubmitting(true)
    router.put(`/tasks/${task.id}`, formData, {
      onSuccess: () => {
        setSubmitting(false)
        if (onUpdate && task) {
          onUpdate({ ...task, ...formData } as Task)
        }
      },
      onError: (errorData) => {
        setSubmitting(false)
        setErrors(errorData as Record<string, string>)
      },
    })
  }

  // Đánh dấu task hoàn thành
  const handleMarkAsCompleted = async () => {
    if (!task?.id) return

    const completedStatusId = await markTaskAsCompleted(task, statuses)
    if (!completedStatusId) return

    setFormData((prev) => ({ ...prev, status_id: completedStatusId }))
    router.put(
      `/tasks/${task.id}/status`,
      { status_id: completedStatusId },
      {
        onSuccess: () => {
          if (onUpdate && task) {
            onUpdate({ ...task, status_id: completedStatusId } as Task)
          }
        },
      }
    )
  }

  // Xóa task
  const handleSoftDelete = () => {
    if (!task?.id) return
    if (confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này?')) {
      router.delete(`/tasks/${task.id}`)
    }
  }

  return {
    formData,
    date,
    activeTab,
    errors,
    submitting,
    auditLogs,
    isEditing,
    setActiveTab,
    setIsEditing,
    handleChange,
    handleSelectChange,
    handleDateChange,
    handleSubmit,
    handleMarkAsCompleted,
    handleSoftDelete,
    canEdit,
    canDelete,
    canMarkAsCompleted,
  }
}
