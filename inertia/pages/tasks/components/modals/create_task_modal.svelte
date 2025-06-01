<script lang="ts">
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import { router } from '@inertiajs/svelte'
  import CreateTaskForm from './create_task_form.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    statuses?: Array<{ id: number; name: string }>
    priorities?: Array<{ id: number; name: string }>
    labels?: Array<{ id: number; name: string }>
    users?: Array<{ id: number; username: string; email: string }>
  }

  let {
    open = $bindable(false),
    onOpenChange,
    statuses = [],
    priorities = [],
    labels = [],
    users = []
  }: Props = $props()

  const { t } = useTranslation()

  let formData = $state({
    title: '',
    description: '',
    status_id: '',
    priority_id: '',
    label_id: '',
    assigned_to: '',
    due_date: ''
  })

  let errors = $state<Record<string, string>>({})
  let submitting = $state(false)

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = t('task.title', {}, 'Tiêu đề') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (!formData.status_id) {
      newErrors.status_id = t('task.status', {}, 'Trạng thái') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      return
    }

    submitting = true

    router.post('/tasks', formData, {
      onSuccess: () => {
        submitting = false
        onOpenChange(false)
        resetForm()
      },
      onError: (errorResponse) => {
        submitting = false
        errors = errorResponse
      }
    })
  }

  const resetForm = () => {
    formData = {
      title: '',
      description: '',
      status_id: '',
      priority_id: '',
      label_id: '',
      assigned_to: '',
      due_date: ''
    }
    errors = {}
  }

  const handleClose = () => {
    onOpenChange(false)
    resetForm()
  }

  const setFormData = (updater: (prev: typeof formData) => typeof formData) => {
    formData = updater(formData)
  }
</script>

<Dialog bind:open onOpenChange={onOpenChange}>
  <DialogContent class="sm:max-w-137.5">
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
        onclick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? t('common.creating', {}, 'Đang tạo...') : t('task.add_task', {}, 'Tạo nhiệm vụ')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
