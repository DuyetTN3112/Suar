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
  currentUser?: unknown
}

export function useTaskDetailForm({
  task,
  formData,
  setFormData,
  isEditing,
  errors,
  setErrors,
  setSubmitting,
  onUpdate,
  currentUser,
}: UseTaskDetailFormProps) {
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
  const handleDateChange = (date: Date | undefined) => {
    if (!isEditing) return
    if (date) {
      setFormData((prev) => ({
        ...prev,
        due_date: date.toISOString().split('T')[0],
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

    // Tìm ID của người dùng hiện tại
    let userId = null
    let organizationId = null

    // Thử lấy từ currentUser trước
    if (currentUser) {
      userId = currentUser.id || currentUser.userId || (currentUser.user && currentUser.user.id)
      organizationId =
        currentUser.current_organization_id ||
        currentUser.organizationId ||
        (currentUser.organization && currentUser.organization.id)
    }

    // Nếu không có trong currentUser, thử lấy từ window.auth
    if ((!userId || !organizationId) && typeof window !== 'undefined') {
      const windowAuth = (window as unknown).auth
      if (windowAuth?.user?.id) {
        userId = windowAuth.user.id
      }

      if (windowAuth?.user?.current_organization_id) {
        organizationId = windowAuth.user.current_organization_id
      }
    }

    if (!userId) {
      console.error('Không thể xác định ID người dùng hiện tại để cập nhật task')
    }

    // Thêm thông tin người cập nhật và tổ chức vào dữ liệu gửi đi
    const dataToSubmit = {
      ...formData,
      updated_by: userId,
      // Giữ lại organization_id của task nếu đã có, nếu không thì sử dụng organization của người dùng hiện tại
      organization_id: task.organization_id || organizationId,
    }

    // Gửi request cập nhật task
    router.put(`/tasks/${task.id}`, dataToSubmit, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: (page) => {
        setSubmitting(false)
        // Cập nhật trạng thái local với dữ liệu mới
        if (onUpdate && task) {
          // Tạo task mới kết hợp giữa task cũ và dữ liệu form đã được gửi
          const updatedTask = { ...task, ...formData } as Task
          onUpdate(updatedTask)
        }
      },
      onError: (errorData) => {
        setSubmitting(false)
        console.error('Error updating task:', errorData)
        setErrors(errorData as Record<string, string>)
      },
    })
  }
  return {
    handleChange,
    handleSelectChange,
    handleDateChange,
    handleSubmit,
  }
}
