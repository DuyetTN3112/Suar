<script lang="ts">
  /* eslint-disable prefer-const */
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
  import { FRONTEND_ROUTES } from '@/constants'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialStatus?: string
    onCreated?: (task: Task) => void
    statuses?: Array<{ value: string; label: string }>
    priorities?: Array<{ value: string; label: string }>
    labels?: Array<{ value: string; label: string }>
    projects?: Array<{ id: string; name: string }>
    users?: Array<{ id: string; username: string; email: string }>
    parentTasks?: Array<{ id: string; title: string; task_status_id: string | null }>
    availableSkills?: Array<{ id: string; name: string }>
    initialProjectId?: string
  }

  let {
    open = $bindable(false),
    onOpenChange,
    initialStatus = '',
    onCreated,
    statuses = [],
    priorities = [],
    labels = [],
    projects = [],
    users = [],
    parentTasks = [],
    availableSkills = [],
    initialProjectId = '',
  }: Props = $props()

  const { t } = useTranslation()

  let formData = $state({
    title: '',
    description: '',
    task_status_id: '',
    task_type: 'feature_development',
    verification_method: 'code_review',
    project_id: '',
    priority: '',
    label: '',
    assigned_to: '',
    due_date: '',
    parent_task_id: '',
    estimated_time: '0',
    required_skills: [] as Array<{ id: string; name: string; level: string }>,
    acceptance_criteria: '',
    context_background: '',
    tech_stack_text: '',
    learning_objectives_text: '',
    domain_tags_text: '',
  })

  let errors = $state<Record<string, string>>({})
  let submitting = $state(false)
  let wasOpen = $state(false)

  $effect(() => {
    if (open && !wasOpen) {
      const preferredStatus = initialStatus || statuses[0]?.value || ''
      const preferredProject = initialProjectId || projects[0]?.id || ''
      if (preferredStatus) {
        formData = {
          ...formData,
          task_status_id: preferredStatus,
          project_id: preferredProject,
        }
      } else if (preferredProject) {
        formData = {
          ...formData,
          project_id: preferredProject,
        }
      }
    }
    wasOpen = open
  })

  const parseListInput = (raw: string) =>
    raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

  const buildPayload = () => ({
    title: formData.title,
    description: formData.description,
    task_status_id: formData.task_status_id,
    project_id: formData.project_id,
    task_type: formData.task_type,
    verification_method: formData.verification_method,
    priority: formData.priority || undefined,
    label: formData.label || undefined,
    assigned_to: formData.assigned_to || undefined,
    due_date: formData.due_date || undefined,
    parent_task_id: formData.parent_task_id || undefined,
    estimated_time: Number(formData.estimated_time || 0),
    required_skills: formData.required_skills.map((skill) => ({
      id: skill.id,
      level: skill.level,
    })),
    acceptance_criteria: formData.acceptance_criteria,
    context_background: formData.context_background || undefined,
    tech_stack: parseListInput(formData.tech_stack_text),
    learning_objectives: parseListInput(formData.learning_objectives_text),
    domain_tags: parseListInput(formData.domain_tags_text),
  })

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = t('task.title', {}, 'Tiêu đề') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (!formData.task_status_id) {
      newErrors.task_status_id =
        t('task.status', {}, 'Trạng thái') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (!formData.project_id) {
      newErrors.project_id = 'Project là bắt buộc'
    }

    if (formData.required_skills.length === 0) {
      newErrors.required_skills =
        t('task.required_skills', {}, 'Kỹ năng yêu cầu') +
        ' ' +
        t('common.is_required', {}, 'là bắt buộc')
    }

    if (!formData.acceptance_criteria.trim()) {
      newErrors.acceptance_criteria = 'Acceptance criteria là bắt buộc'
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      return
    }

    submitting = true

    try {
      const response = await axios.post<{ success: boolean; data: Task }>(FRONTEND_ROUTES.TASKS, buildPayload(), {
        headers: {
          Accept: 'application/json',
        },
      })

      onCreated?.(response.data.data)

      notificationStore.success(t('task.create_success', {}, 'Tạo nhiệm vụ thành công'))
      onOpenChange(false)
      resetForm()
    } catch (error: unknown) {
      const errorResponse = (error as {
        response?: {
          status?: number
          data?: { errors?: Record<string, string>; message?: string }
        }
      }).response
      const errorPayload = errorResponse?.data

      errors = errorResponse?.data?.errors || {}
      if (!errorPayload?.errors) {
        notificationStore.error(
          errorResponse?.status === 403
            ? 'Bạn không đủ quyền tạo nhiệm vụ'
            : t('task.create_failed', {}, 'Không thể tạo nhiệm vụ'),
          errorResponse?.data?.message || t('common.please_try_again', {}, 'Vui lòng thử lại')
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
      task_status_id: '',
      task_type: 'feature_development',
      verification_method: 'code_review',
      project_id: '',
      priority: '',
      label: '',
      assigned_to: '',
      due_date: '',
      parent_task_id: '',
      estimated_time: '0',
      required_skills: [],
      acceptance_criteria: '',
      context_background: '',
      tech_stack_text: '',
      learning_objectives_text: '',
      domain_tags_text: '',
    }
    errors = {}
  }

  const handleClose = () => {
    onOpenChange(false)
    resetForm()
  }

  const setFormData = (updater: (prev: typeof formData) => typeof formData) => {
    formData = updater(formData)
    const nextErrors = { ...errors }
    if (errors.required_skills && formData.required_skills.length > 0) {
      delete nextErrors.required_skills
    }
    if (errors.task_status_id && formData.task_status_id) {
      delete nextErrors.task_status_id
    }
    if (errors.project_id && formData.project_id) {
      delete nextErrors.project_id
    }
    if (errors.acceptance_criteria && formData.acceptance_criteria.trim()) {
      delete nextErrors.acceptance_criteria
    }
    errors = nextErrors
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
      {projects}
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
