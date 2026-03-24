<script lang="ts">
  import axios from 'axios'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import type { Task } from '../../types.svelte'
  import CreateTaskForm from './create_task_form.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialStatus?: string
    onCreated?: (task: Task) => void
    statuses?: Array<{ value: string; label: string }>
    priorities?: Array<{ value: string; label: string }>
    labels?: Array<{ value: string; label: string }>
    users?: Array<{ id: string; username: string; email: string }>
    parentTasks?: Array<{ id: string; title: string; status: string }>
    availableSkills?: Array<{ id: string; name: string }>
  }

  let {
    open = $bindable(false),
    onOpenChange,
    initialStatus = '',
    onCreated,
    statuses = [],
    priorities = [],
    labels = [],
    users = [],
    parentTasks = [],
    availableSkills = [],
  }: Props = $props()

  const { t } = useTranslation()

  let formData = $state({
    title: '',
    description: '',
    status: '',
    priority: '',
    label: '',
    assigned_to: '',
    due_date: '',
    parent_task_id: '',
    estimated_time: '0',
    required_skills: [] as Array<{ id: string; name: string; level: string }>,
  })

  let errors = $state<Record<string, string>>({})
  let submitting = $state(false)
  let wasOpen = $state(false)

  $effect(() => {
    if (open && !wasOpen) {
      const preferredStatus = initialStatus || statuses[0]?.value || ''
      if (preferredStatus) {
        formData = {
          ...formData,
          status: preferredStatus,
        }
      }
    }
    wasOpen = open
  })

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = t('task.title', {}, 'Tiêu đề') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (!formData.status) {
      newErrors.status = t('task.status', {}, 'Trạng thái') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (formData.required_skills.length === 0) {
      newErrors.required_skills =
        t('task.required_skills', {}, 'Kỹ năng yêu cầu') +
        ' ' +
        t('common.is_required', {}, 'là bắt buộc')
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      return
    }

    submitting = true

    try {
      const response = await axios.post<{ success: boolean; data: Task }>('/tasks', formData, {
        headers: {
          Accept: 'application/json',
        },
      })

      if (response.data?.data) {
        onCreated?.(response.data.data)
      }

      notificationStore.success(t('task.create_success', {}, 'Tạo nhiệm vụ thành công'))
      onOpenChange(false)
      resetForm()
    } catch (error: unknown) {
      const errorPayload = (error as { response?: { data?: { errors?: Record<string, string>; message?: string } } })
        .response?.data

      errors = errorPayload?.errors || {}
      if (!errorPayload?.errors) {
        notificationStore.error(
          t('task.create_failed', {}, 'Không thể tạo nhiệm vụ'),
          errorPayload?.message || t('common.please_try_again', {}, 'Vui lòng thử lại')
        )
      }
    } finally {
      submitting = false
    }
  }

  const resetForm = () => {
    formData = {
      title: '',
      description: '',
      status: '',
      priority: '',
      label: '',
      assigned_to: '',
      due_date: '',
      parent_task_id: '',
      estimated_time: '0',
      required_skills: [],
    }
    errors = {}
  }

  const handleClose = () => {
    onOpenChange(false)
    resetForm()
  }

  const setFormData = (updater: (prev: typeof formData) => typeof formData) => {
    formData = updater(formData)
    if (errors.required_skills && formData.required_skills.length > 0) {
      const { required_skills: _ignore, ...rest } = errors
      errors = rest
    }
  }
</script>

<Dialog bind:open onOpenChange={onOpenChange}>
  <DialogContent class="w-[96vw] sm:max-w-6xl max-h-[92vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>{t('task.new_task', {}, 'Tạo nhiệm vụ mới')}</DialogTitle>
      <DialogDescription>
        {t('task.add_task_description', {}, 'Thêm nhiệm vụ mới bằng cách điền thông tin bên dưới.')}
      </DialogDescription>
    </DialogHeader>

    <CreateTaskForm
      {formData}
      {setFormData}
      {errors}
      {statuses}
      {priorities}
      {labels}
      {users}
      {parentTasks}
      {availableSkills}
    />

    <DialogFooter>
      <Button
        variant="outline"
        onclick={handleClose}
        disabled={submitting}
      >
        {t('common.cancel', {}, 'Hủy')}
      </Button>
      <Button
        onclick={() => { void handleSubmit() }}
        disabled={submitting}
      >
        {submitting ? t('common.creating', {}, 'Đang tạo...') : t('task.add_task', {}, 'Tạo nhiệm vụ')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
