<script lang="ts">
  import { router, page  } from '@inertiajs/svelte'

  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import { FRONTEND_ROUTES } from '@/constants'
  import AppLayout from '@/layouts/app_layout.svelte'
import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import CreateTaskForm from './components/modals/create_task_form.svelte'
  import { normalizeTaskFormErrors } from './task_form_errors'


  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    metadata: {
      statuses: { value: string; label: string }[]
      labels: { value: string; label: string }[]
      priorities: { value: string; label: string }[]
      users: { id: string; username: string; email: string }[]
      parentTasks?: { id: string; title: string; task_status_id: string | null }[]
      availableSkills?: { id: string; name: string }[]
      projects?: { id: string; name: string }[]
      proficiencyLevels?: { value: string; label: string }[]
    }
  }

  interface ProjectProfessionalRoleOption {
    id: string
    name: string
    code: string
  }

  interface ProjectProfessionalRolesResponse {
    data?: ProjectProfessionalRoleOption[]
  }

  interface RoleRequirementRecord {
    skill_id: string
    skill_name: string
    project_skill_id?: string
    source_project_professional_role_id?: string
    source_role_skill_id?: string
    minimum_level_id?: string
    target_level_id?: string
    assessment_ceiling_level_id?: string
    is_mandatory?: boolean
    importance?: string
    weight?: number
    requirement_source?: string
    requirement_notes?: string
  }

  interface RoleRequirementsResponse {
    data?: {
      requirements?: RoleRequirementRecord[]
    }
  }

  const { metadata }: Props = $props()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
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
    required_skills: [] as {
      id: string
      name: string
      level: string
      project_skill_id?: string
      source_project_professional_role_id?: string
      source_role_skill_id?: string
      minimum_level_id?: string
      target_level_id?: string
      assessment_ceiling_level_id?: string
      is_mandatory?: boolean
      importance?: string
      weight?: number
      requirement_source?: string
      requirement_notes?: string
    }[],
    acceptance_criteria: '',
    context_background: '',
    tech_stack_text: '',
    learning_objectives_text: '',
    domain_tags_text: '',
  })

  let selectedRoleId = $state('')
  let projectProfessionalRoleId = $state('')
  let availableRoles = $state<ProjectProfessionalRoleOption[]>([])
  let prefilling = $state(false)
  let errors = $state<Record<string, string>>({})
  let formError = $state('')
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

  // Load available roles when project changes
  $effect(() => {
    if (formData.project_id) {
      fetch(`/api/v1/projects/${formData.project_id}/professional-roles`)
        .then((r) => r.json())
        .then((payload) => {
          const data = payload as ProjectProfessionalRolesResponse
          availableRoles = data.data ?? []
        })
        .catch(() => {
          availableRoles = []
        })
    } else {
      availableRoles = []
      selectedRoleId = ''
    }
  })

  async function handlePrefillFromRole() {
    if (!selectedRoleId || !formData.project_id) return
    prefilling = true
    try {
      const resp = await fetch(
        `/api/v1/projects/${formData.project_id}/roles/${selectedRoleId}/requirements`
      )
      const data = (await resp.json()) as RoleRequirementsResponse
      if (data.data?.requirements) {
        const skills = data.data.requirements.map((req) => ({
          id: req.skill_id,
          name: req.skill_name,
          level: 'junior',
          project_skill_id: req.project_skill_id,
          source_project_professional_role_id: req.source_project_professional_role_id,
          source_role_skill_id: req.source_role_skill_id,
          minimum_level_id: req.minimum_level_id,
          target_level_id: req.target_level_id,
          assessment_ceiling_level_id: req.assessment_ceiling_level_id,
          is_mandatory: req.is_mandatory,
          importance: req.importance,
          weight: req.weight,
          requirement_source: req.requirement_source,
          requirement_notes: req.requirement_notes,
        }))
        setFormData((prev) => ({ ...prev, required_skills: skills }))
        projectProfessionalRoleId = selectedRoleId
      }
    } finally {
      prefilling = false
    }
  }

  const parseListInput = (raw: string) =>
    raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

  const normalizeOptionalString = (value: string) => (value.trim().length > 0 ? value : undefined)

  const buildPayload = () => ({
    title: formData.title,
    description: formData.description,
    task_status_id: formData.task_status_id,
    project_id: formData.project_id,
    task_type: formData.task_type,
    verification_method: formData.verification_method,
    priority: normalizeOptionalString(formData.priority),
    label: normalizeOptionalString(formData.label),
    assigned_to: normalizeOptionalString(formData.assigned_to),
    due_date: normalizeOptionalString(formData.due_date),
    parent_task_id: normalizeOptionalString(formData.parent_task_id),
    estimated_time: Number(normalizeOptionalString(formData.estimated_time) ?? 0),
    project_professional_role_id: normalizeOptionalString(projectProfessionalRoleId),
    required_skills: formData.required_skills.map((skill) => ({
      id: skill.id,
      level: skill.level,
      project_skill_id: skill.project_skill_id ?? undefined,
      source_project_professional_role_id: skill.source_project_professional_role_id ?? undefined,
      source_role_skill_id: skill.source_role_skill_id ?? undefined,
      minimum_level_id: skill.minimum_level_id ?? undefined,
      target_level_id: skill.target_level_id ?? undefined,
      assessment_ceiling_level_id: skill.assessment_ceiling_level_id ?? undefined,
      is_mandatory: skill.is_mandatory ?? true,
      importance: skill.importance ?? undefined,
      weight: skill.weight ?? undefined,
      requirement_source: skill.requirement_source ?? undefined,
      requirement_notes: skill.requirement_notes ?? undefined,
    })),
    acceptance_criteria: formData.acceptance_criteria,
    context_background: normalizeOptionalString(formData.context_background),
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
      formError = ''
      return
    }

    submitting = true
    errors = {}
    formError = ''

    router.post(FRONTEND_ROUTES.TASKS, buildPayload(), {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        submitting = false
      },
      onError: (errorResponse) => {
        submitting = false
        const normalizedError = normalizeTaskFormErrors(errorResponse)
        errors = normalizedError.fieldErrors
        formError = normalizedError.formError ?? normalizedError.message ?? ''
      },
    })
  }

  const handleCancel = () => {
    router.visit(FRONTEND_ROUTES.TASKS)
  }

  const setFormData = (updater: (prev: typeof formData) => typeof formData) => {
    formData = updater(formData)

    const nextErrors = { ...errors }
    const previousErrorCount = Object.keys(nextErrors).length
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
    if (formError && Object.keys(nextErrors).length < previousErrorCount) {
      formError = ''
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<Layout title={pageTitle}>
  <h1 class="sr-only">{pageTitle}</h1>
  <h2 class="sr-only">{pageTitle} Form</h2>
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
        {#if formData.project_id && availableRoles.length > 0}
          <div class="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
            <div class="flex items-center justify-between gap-4">
              <div class="flex-1">
                <label
                  for="professional-role-prefill"
                  class="block text-sm font-medium text-blue-900 dark:text-blue-100"
                >
                  Chọn Professional Role để prefill kỹ năng
                </label>
                <p class="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Chọn role từ project để tự động điền kỹ năng yêu cầu theo tiêu chuẩn role.
                </p>
              </div>
              <div class="flex items-center gap-2">
                <select
                  id="professional-role-prefill"
                  bind:value={selectedRoleId}
                  class="h-9 rounded-md border border-blue-300 bg-white px-3 text-sm dark:border-blue-700 dark:bg-slate-800"
                >
                  <option value="">-- Chọn role --</option>
                  {#each availableRoles as role}
                    <option value={role.id}>{role.name} ({role.code})</option>
                  {/each}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onclick={handlePrefillFromRole}
                  disabled={!selectedRoleId || prefilling}
                >
                  {prefilling ? 'Đang tải...' : 'Prefill kỹ năng'}
                </Button>
              </div>
            </div>
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
          proficiencyLevels={metadata.proficiencyLevels ?? []}
          {formError}
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
</Layout>
