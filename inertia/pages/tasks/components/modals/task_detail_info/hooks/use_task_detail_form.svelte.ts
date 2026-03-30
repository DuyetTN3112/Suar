import { router } from '@inertiajs/svelte'
import type { Task } from '../../../../types.svelte'

type CurrentUserLike = {
  id?: string
  userId?: string
  current_organization_id?: string
  organizationId?: string
  user?: {
    id?: string
    current_organization_id?: string
    organizationId?: string
  }
  organization?: {
    id?: string
  }
}

type ErrorMap = Record<string, string>

interface UseTaskDetailFormProps {
  getTask: () => Task | null
  getFormData: () => Partial<Task>
  setFormData: (updater: (prev: Partial<Task>) => Partial<Task>) => void
  isEditing: () => boolean
  getErrors: () => ErrorMap
  setErrors: (errors: ErrorMap) => void
  setSubmitting: (value: boolean) => void
  getOnUpdate?: () => ((updatedTask: Task | null) => void) | undefined
  getCurrentUser?: () => CurrentUserLike | null | undefined
}

export function useTaskDetailForm({
  getTask,
  getFormData,
  setFormData,
  isEditing,
  getErrors,
  setErrors,
  setSubmitting,
  getOnUpdate,
  getCurrentUser,
}: UseTaskDetailFormProps) {
  const removeError = (field: string, currentErrors: ErrorMap) => {
    if (!currentErrors[field]) return

    const nextErrors = Object.entries(currentErrors).reduce<ErrorMap>(
      (accumulator, [key, value]) => {
        if (key !== field) {
          accumulator[key] = value
        }

        return accumulator
      },
      {}
    )

    setErrors(nextErrors)
  }

  const resolveCurrentUserContext = (source?: CurrentUserLike | null) => {
    if (!source) {
      return {
        organizationId: null,
        userId: null,
      }
    }

    return {
      userId: source.id ?? source.userId ?? source.user?.id ?? null,
      organizationId:
        source.current_organization_id ??
        source.organizationId ??
        source.user?.current_organization_id ??
        source.user?.organizationId ??
        source.organization?.id ??
        null,
    }
  }

  // Xử lý sự kiện thay đổi input
  const handleChange = (e: Event) => {
    if (!isEditing()) return
    const target = e.target as HTMLInputElement | HTMLTextAreaElement
    const { name, value } = target
    setFormData((prev) => ({ ...prev, [name]: value }))
    removeError(name, getErrors())
  }

  // Xử lý sự kiện thay đổi select
  const handleSelectChange = (name: string, value: string) => {
    if (!isEditing()) return
    setFormData((prev) => ({ ...prev, [name]: value }))
    removeError(name, getErrors())
  }

  // Xử lý sự kiện thay đổi ngày
  const handleDateChange = (date: Date | undefined) => {
    if (!isEditing()) return
    if (date) {
      setFormData((prev) => ({
        ...prev,
        due_date: date.toISOString().split('T')[0],
      }))
      const currentErrors = getErrors()
      if (currentErrors.due_date) {
        removeError('due_date', currentErrors)
      }
    } else {
      setFormData((prev) => ({ ...prev, due_date: '' }))
    }
  }

  // Xử lý sự kiện submit form
  const handleSubmit = () => {
    const task = getTask()
    if (!task?.id) return
    const formData = getFormData()

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
    let { userId, organizationId } = resolveCurrentUserContext(getCurrentUser?.())

    // Nếu không có trong currentUser, thử lấy từ window.auth
    if ((!userId || !organizationId) && typeof window !== 'undefined') {
      const authUser = (
        window as Window & {
          auth?: {
            user?: CurrentUserLike
          }
        }
      ).auth?.user
      const authContext = resolveCurrentUserContext(authUser)

      if (!userId && authContext.userId) {
        userId = authContext.userId
      }

      if (!organizationId && authContext.organizationId) {
        organizationId = authContext.organizationId
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
      onSuccess: () => {
        setSubmitting(false)
        const onUpdate = getOnUpdate?.()
        // Cập nhật trạng thái local với dữ liệu mới
        if (onUpdate) {
          // Tạo task mới kết hợp giữa task cũ và dữ liệu form đã được gửi
          const updatedTask: Task = { ...task, ...formData }
          onUpdate(updatedTask)
        }
      },
      onError: (errorData: unknown) => {
        setSubmitting(false)
        console.error('Error updating task:', errorData)
        const normalizedErrors = normalizeErrorMap(errorData)
        setErrors(normalizedErrors)
      },
    })
  }

  function normalizeErrorMap(errorData: unknown): ErrorMap {
    if (!errorData || typeof errorData !== 'object') {
      return {}
    }

    return Object.entries(errorData).reduce<ErrorMap>((accumulator, [key, value]) => {
      if (typeof value === 'string') {
        accumulator[key] = value
      }

      return accumulator
    }, {})
  }

  return {
    handleChange,
    handleSelectChange,
    handleDateChange,
    handleSubmit,
  }
}
