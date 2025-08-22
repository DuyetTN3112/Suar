<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import { FRONTEND_ROUTES } from '@/constants'
  import AppLayout from '@/layouts/app_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import CreateTaskForm from './components/modals/create_task_form.svelte'


  interface Props {
    metadata: {
      statuses: { value: string; label: string }[]
      labels: { value: string; label: string }[]
      priorities: { value: string; label: string }[]
      users: { id: string; username: string; email: string }[]
      parentTasks?: { id: string; title: string; task_status_id: string | null }[]
      availableSkills?: { id: string; name: string }[]
      projects?: { id: string; name: string }[]
    }
  }

  const { metadata }: Props = $props()
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
    required_skills: [] as { id: string; name: string; level: string }[],
    acceptance_criteria: '',
    context_background: '',
    tech_stack_text: '',
    learning_objectives_text: '',
    domain_tags_text: '',
  })

  let errors = $state<Record<string, string>>({})
  let submitting = $state(false)

  const pageTitle = $derived(t('task.new_task', {}, 'Tạo nhiệm vụ mới'))

  $effect(() => {
    if (!formData.task_status_id && metadata.statuses[0]?.value) {
      formData = {
        ...formData,
        task_status_id: metadata.statuses[0].value,
      }
    }

    if (!formData.project_id && metadata.projects?.[0]?.id) {
      formData = {
        ...formData,
        project_id: metadata.projects[0].id,
      }
    }
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

  const handleSubmit = () => {
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

    router.post(FRONTEND_ROUTES.TASKS, buildPayload(), {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        submitting = false
      },
      onError: (errorResponse) => {
        submitting = false
        errors = errorResponse
      },
    })
  }

  const handleCancel = () => {
    router.visit(FRONTEND_ROUTES.TASKS)
  }

  const setFormData = (updater: (prev: typeof formData) => typeof formData) => {
    formData = updater(formData)

    const nextErrors = { ...errors }
    if (nextErrors.task_status_id && formData.task_status_id) {
      delete nextErrors.task_status_id
    }
    if (nextErrors.project_id && formData.project_id) {
      delete nextErrors.project_id
    }
    if (nextErrors.required_skills && formData.required_skills.length > 0) {
      delete nextErrors.required_skills
    }
    if (nextErrors.acceptance_criteria && formData.acceptance_criteria.trim()) {
      delete nextErrors.acceptance_criteria
    }
    errors = nextErrors
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="mx-auto max-w-5xl p-4 sm:p-6">
    <Card>
      <CardHeader>
        <CardTitle>{pageTitle}</CardTitle>
        <p class="text-sm text-muted-foreground">
          Mỗi task bắt buộc thuộc đúng một project để workflow, review và profile snapshot ăn khớp nhau.
        </p>
      </CardHeader>

      <CardContent>
        {#if (metadata.projects?.length ?? 0) === 0}
          <div class="mb-4 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100">
            Tổ chức hiện tại chưa có project. Hãy tạo project trước khi tạo task.
          </div>
        {/if}
        <CreateTaskForm
          {formData}
          {setFormData}
          {errors}
          statuses={metadata.statuses}
          priorities={metadata.priorities}
          labels={metadata.labels}
          users={metadata.users}
          parentTasks={metadata.parentTasks ?? []}
          availableSkills={metadata.availableSkills ?? []}
          projects={metadata.projects ?? []}
        />
      </CardContent>

      <CardFooter class="flex justify-end gap-3 border-t pt-6">
        <Button variant="outline" onclick={handleCancel} disabled={submitting}>
          {t('common.cancel', {}, 'Hủy')}
        </Button>
        <Button onclick={handleSubmit} disabled={submitting || (metadata.projects?.length ?? 0) === 0}>
          {submitting ? t('common.creating', {}, 'Đang tạo...') : t('task.add_task', {}, 'Tạo nhiệm vụ')}
        </Button>
      </CardFooter>
    </Card>
  </div>
</AppLayout>
