import { router } from '@inertiajs/react'
import { Task } from '../../../../types'

interface UseTaskDetailFormProps {
  task: Task | null
  formData: Partial<Task>
  setFormData: React.Dispatch<React.SetStateAction<Partial<Task>>>
  isEditing: boolean
  errors: Record<string, string>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  submitting: boolean
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>
  onUpdate?: (updatedTask: Task) => void
}

export function useTaskDetailForm({
  task,
  formData,
  setFormData,
  isEditing,
  errors,
  setErrors,
  submitting,
  setSubmitting,
  onUpdate
}: UseTaskDetailFormProps) {
  // Xử lý sự kiện thay đổi input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!isEditing) return
    
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Xử lý sự kiện thay đổi select
  const handleSelectChange = (name: string, value: string) => {
    if (!isEditing) return
    
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Xử lý sự kiện thay đổi ngày
  const handleDateChange = (date: Date | undefined) => {
    if (!isEditing) return
    
    if (date) {
      setFormData(prev => ({ 
        ...prev, 
        due_date: date.toISOString().split('T')[0]
      }))
      
      if (errors.due_date) {
        setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.due_date
          return newErrors
        })
      }
    } else {
      setFormData(prev => ({ ...prev, due_date: '' }))
    }
  }
  
  // Xử lý sự kiện submit form
  const handleSubmit = () => {
    if (!task?.id) return
    
    // Validate form
    const newErrors: Record<string, string> = {}
    if (!formData.title?.trim()) {
      newErrors.title = 'Tiêu đề là bắt buộc'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setSubmitting(true)
    
    // Gửi request cập nhật task
    router.put(`/tasks/${task.id}`, formData, {
      onSuccess: () => {
        setSubmitting(false)
        if (onUpdate && task) {
          onUpdate({ ...task, ...formData } as Task)
        }
      },
      onError: (errors) => {
        setSubmitting(false)
        setErrors(errors as Record<string, string>)
      },
    })
  }
  
  return {
    handleChange,
    handleSelectChange,
    handleDateChange,
    handleSubmit
  }
} 