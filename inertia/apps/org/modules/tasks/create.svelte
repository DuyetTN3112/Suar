<script lang="ts">
  import { page, router } from '@inertiajs/svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardFooter from '@/apps/org/shared/ui/card_footer.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import CreateTaskForm from '@/apps/org/modules/tasks/components/modals/create_task_form.svelte'
  import type { TaskCreateAssigneeGroups, TaskCreateFormData } from '@/apps/org/modules/tasks/types/create_form_types'
  import { getTaskContractPreset, mergeTaskContractPreset } from '@/apps/org/modules/tasks/lib/rules/task_contract_presets'
  import { normalizeTaskFormErrors } from '@/apps/org/modules/tasks/lib/errors/task_form_errors'
  import {
    countTaskSkillsByCategory,
    formatTaskSkillCategoryViolations,
    getTaskSkillCategoryViolations,
  } from '@/apps/org/modules/tasks/lib/rules/task_skill_category_rules'
  import TaskReadinessCard from '@/apps/org/modules/tasks/components/detail/task_readiness_card.svelte'
  import TaskRolePrefillPanel from '@/apps/org/modules/tasks/components/detail/task_role_prefill_panel.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null; current_project?: { id: string; name?: string | null } | null } }
    metadata: {
      statuses: { value: string; label: string }[]
      labels: { value: string; label: string }[]
      priorities: { value: string; label: string }[]
      users: { id: string; username: string; email: string }[]
      parentTasks?: { id: string; title: string; task_status_id: string | null }[]
      availableSkills?: {
        id: string
        name: string
        categoryCode?: string | null
        rubricVersionId?: string | null
      }[]
      projects?: { id: string; name: string }[]
      proficiencyLevels?: { value: string; label: string }[]
    }
  }

  interface InertiaPageLike {
    props: Props
    url: string
  }

  interface ProjectDetailMemberRecord {
    userId: string
    username: string
    email: string
    role: string
    projectProfessionalRoleId?: string | null
    professionalRoleName?: string | null
  }

  interface ProjectDetailApiResponse {
    data?: {
      project?: {
        visibility?: string | null
      }
      members?: ProjectDetailMemberRecord[]
    }
  }

  interface ProjectMemberCandidateResponse {
    data?: {
      userId: string
      username: string
      email: string
      orgRole: string
    }[]
  }

  const { metadata }: Props = $props()
  const currentPage = page as unknown as InertiaPageLike
  
  const { t } = useTranslation()
  const currentQuery = $derived(new URLSearchParams(currentPage.url.split('?')[1] ?? ''))
  const currentProjectId = $derived(currentPage.props.auth?.user?.current_project?.id ?? '')
  const requestedProjectId = $derived(currentQuery.get('project_id') ?? currentQuery.get('projectId') ?? '')
  const requestedRoleId = $derived(currentQuery.get('roleId') ?? currentQuery.get('role_id') ?? '')
  const requestedTaskType = $derived(currentQuery.get('taskType') ?? currentQuery.get('task_type') ?? '')
  const fallbackProjectId = $derived(metadata.projects?.[0]?.id ?? '')

  let formData = $state<TaskCreateFormData>({
    title: '',
    description: '',
    task_status_id: '',
    task_type: 'feature_development',
    verification_method: 'code_review',
    project_id: '',
    priority: '',
    label: '',
    task_visibility: 'internal',
    assigned_to: '',
    due_date: '',
    parent_task_id: '',
    estimated_time: '0',
    required_skills: [],
    acceptance_criteria: '',
    context_background: '',
    role_in_task: '',
    business_domain: '',
    problem_category: '',
    tech_stack_text: '',
    learning_objectives_text: '',
    domain_tags_text: '',
  })

  let projectProfessionalRoleId = $state('')
  let assigneeGroups = $state<TaskCreateAssigneeGroups>({
    projectMembers: [],
    orgMembersOutsideProject: [],
  })
  let selectedProjectVisibility = $state<string | null>(null)
  let loadingAssigneeGroups = $state(false)
  let didAutoApplyTaskStarter = $state(false)
  let errors = $state<Record<string, string>>({})
  let formError = $state('')
  let submitting = $state(false)
  let assigneeGroupRequestKey = 0

  const pageTitle = $derived(t('task.new_task', {}, 'Create new task'))
  const selectedProject = $derived(
    metadata.projects?.find((project) => project.id === formData.project_id) ?? null
  )
  const selectedAssignee = $derived(
    metadata.users.find((user) => user.id === formData.assigned_to) ?? null
  )
  const taskVisibilitySummary = $derived(
    t(
      `task.create.visibility.${formData.task_visibility}`,
      {},
      t('task.create.project_visibility_unknown', {}, 'Unknown')
    )
  )
  const contractChecks = $derived([
    {
      key: 'project',
      label: t('task.create.project', {}, 'Project'),
      done: Boolean(formData.project_id),
    },
    {
      key: 'skills',
      label: t('task.create.skills_heading', {}, 'Skills'),
      done: formData.required_skills.length > 0,
    },
    {
      key: 'acceptance',
      label: t('task.create.acceptance_criteria', {}, 'Acceptance criteria'),
      done: formData.acceptance_criteria.trim().length > 0,
    },
    {
      key: 'verification',
      label: t('task.create.verification', {}, 'Verification'),
      done: formData.verification_method.trim().length > 0,
    },
    {
      key: 'assignee',
      label: t('task.create.assignee', {}, 'Assignee'),
      done: formData.assigned_to.trim().length > 0,
    },
  ])
  const completedContractChecks = $derived(contractChecks.filter((item) => item.done).length)
  const contractReadyForAssignment = $derived(
    Boolean(formData.project_id) &&
      formData.required_skills.length > 0 &&
      formData.acceptance_criteria.trim().length > 0 &&
      formData.verification_method.trim().length > 0
  )
  const scopedAssigneeUsers = $derived([
    ...assigneeGroups.projectMembers.map((member) => ({
      id: member.id,
      username: member.username,
      email: member.email,
    })),
    ...assigneeGroups.orgMembersOutsideProject
      .filter((member) => !assigneeGroups.projectMembers.some((projectMember) => projectMember.id === member.id))
      .map((member) => ({
        id: member.id,
        username: member.username,
        email: member.email,
      })),
    ...metadata.users.filter((user) =>
      !assigneeGroups.projectMembers.some((member) => member.id === user.id) &&
      !assigneeGroups.orgMembersOutsideProject.some((member) => member.id === user.id)
    ),
  ])

  $effect(() => {
    if (!formData.task_status_id && metadata.statuses[0]?.value) {
      formData = {
        ...formData,
        task_status_id: metadata.statuses[0].value,
      }
    }

    if (!formData.project_id && requestedProjectId) {
      formData = {
        ...formData,
        project_id: requestedProjectId,
      }
    } else if (!formData.project_id && currentProjectId) {
      formData = {
        ...formData,
        project_id: currentProjectId,
      }
    } else if (!formData.project_id && fallbackProjectId) {
      formData = {
        ...formData,
        project_id: fallbackProjectId,
      }
    }
  })

  $effect(() => {
    const projectId = formData.project_id
    if (!projectId) {
      assigneeGroups = {
        projectMembers: [],
        orgMembersOutsideProject: [],
      }
      selectedProjectVisibility = null
      return
    }

    const requestKey = ++assigneeGroupRequestKey
    loadingAssigneeGroups = true

    Promise.all([
      fetch(`/api/v1/projects/${projectId}`).then((response) => response.json() as Promise<ProjectDetailApiResponse>),
      fetch(`/projects/${projectId}/member-candidates`).then((response) => response.json() as Promise<ProjectMemberCandidateResponse>),
    ])
      .then(([projectPayload, candidatePayload]) => {
        if (requestKey !== assigneeGroupRequestKey) return

        selectedProjectVisibility = projectPayload.data?.project?.visibility ?? null
        assigneeGroups = {
          projectMembers: (projectPayload.data?.members ?? []).map((member) => ({
            id: member.userId,
            username: member.username,
            email: member.email,
            governanceRole: member.role,
            deliveryRoleName: member.professionalRoleName ?? null,
            projectProfessionalRoleId: member.projectProfessionalRoleId ?? null,
          })),
          orgMembersOutsideProject: (candidatePayload.data ?? []).map((member) => ({
            id: member.userId,
            username: member.username,
            email: member.email,
            orgRole: member.orgRole,
          })),
        }
      })
      .catch(() => {
        if (requestKey !== assigneeGroupRequestKey) return
        selectedProjectVisibility = null
        assigneeGroups = {
          projectMembers: [],
          orgMembersOutsideProject: [],
        }
      })
      .finally(() => {
        if (requestKey === assigneeGroupRequestKey) {
          loadingAssigneeGroups = false
        }
      })
  })

  $effect(() => {
    if (didAutoApplyTaskStarter || !requestedTaskType) return

    const preset = getTaskContractPreset(requestedTaskType, t)
    if (!preset) return

    didAutoApplyTaskStarter = true
    setFormData((prev) => mergeTaskContractPreset(prev, preset))
  })

  const parseListInput = (raw: string) =>
    raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

  const normalizeOptionalString = (value: string) => (value.trim().length > 0 ? value : undefined)

  function validateRequiredSkillMix(): string | null {
    const categoryCounts = countTaskSkillsByCategory(
      formData.required_skills.map((skill) => skill.categoryCode)
    )
    const violations = getTaskSkillCategoryViolations(categoryCounts)

    return violations.length > 0 ? formatTaskSkillCategoryViolations(violations) : null
  }

  const buildPayload = () => ({
    title: formData.title,
    description: formData.description,
    taskStatusId: formData.task_status_id,
    projectId: formData.project_id,
    taskType: formData.task_type,
    verificationMethod: formData.verification_method,
    priority: normalizeOptionalString(formData.priority),
    label: normalizeOptionalString(formData.label),
    taskVisibility: formData.task_visibility,
    assignedTo: normalizeOptionalString(formData.assigned_to),
    dueDate: normalizeOptionalString(formData.due_date),
    parentTaskId: normalizeOptionalString(formData.parent_task_id),
    estimatedTime: Number(normalizeOptionalString(formData.estimated_time) ?? 0),
    projectProfessionalRoleId: normalizeOptionalString(projectProfessionalRoleId),
    requiredSkills: formData.required_skills.map((skill) => ({
      id: skill.id,
      level: skill.level,
      customName: skill.custom_name ?? undefined,
      categoryCode: skill.category_code ?? skill.categoryCode ?? undefined,
      projectSkillId: skill.project_skill_id ?? undefined,
      sourceProjectProfessionalRoleId: skill.source_project_professional_role_id ?? undefined,
      sourceRoleSkillId: skill.source_role_skill_id ?? undefined,
      minimumLevelId: skill.minimum_level_id ?? undefined,
      targetLevelId: skill.target_level_id ?? undefined,
      assessmentCeilingLevelId: skill.assessment_ceiling_level_id ?? undefined,
      rubricVersionId: skill.rubric_version_id ?? undefined,
      isMandatory: skill.is_mandatory ?? true,
      importance: skill.importance ?? undefined,
      weight: skill.weight ?? undefined,
      requirementSource: skill.requirement_source ?? undefined,
      requirementNotes: skill.requirement_notes ?? undefined,
    })),
    acceptanceCriteria: formData.acceptance_criteria,
    contextBackground: normalizeOptionalString(formData.context_background),
    roleInTask: normalizeOptionalString(formData.role_in_task),
    businessDomain: normalizeOptionalString(formData.business_domain),
    problemCategory: normalizeOptionalString(formData.problem_category),
    techStack: parseListInput(formData.tech_stack_text),
    learningObjectives: parseListInput(formData.learning_objectives_text),
    domainTags: parseListInput(formData.domain_tags_text),
  })

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = t('task.title', {}, 'Title') + ' ' + t('common.is_required', {}, 'is required')
    }

    if (!formData.task_status_id) {
      newErrors.task_status_id =
        t('task.status', {}, 'Status') + ' ' + t('common.is_required', {}, 'is required')
    }

    if (!formData.project_id) {
      newErrors.project_id = t('task.create.project_required', {}, 'Project is required')
    }

    if (formData.required_skills.length === 0) {
      newErrors.required_skills =
        t('task.marketplace_card.required_skills', {}, 'Required skills') +
        ' ' +
        t('common.is_required', {}, 'is required')
    } else {
      const requiredSkillMixError = validateRequiredSkillMix()
      if (requiredSkillMixError) {
        newErrors.required_skills = requiredSkillMixError
      }
    }

    if (!formData.acceptance_criteria.trim()) {
      newErrors.acceptance_criteria = t('task.create.acceptance_criteria_required', {}, 'Acceptance criteria is required')
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
        const normalizedError = normalizeTaskFormErrors(
          errorResponse,
          t('task.mutation.fallback', {}, 'Unable to process the request. Please try again.')
        )
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

<OrganizationLayout title={pageTitle}>
  <h1 class="sr-only">{pageTitle}</h1>
  <h2 class="sr-only">{t('task.create.form_sr_title', { title: pageTitle }, `${pageTitle} Form`)}</h2>
  <div class="mx-auto max-w-5xl p-4 sm:p-6">
    <Card>
      <CardHeader>
        <CardTitle>{pageTitle}</CardTitle>
        <p class="text-sm text-muted-foreground">
          {selectedProject?.name ?? t('task.create.no_project_selected', {}, 'No project selected')}
        </p>
      </CardHeader>

      <CardContent>
        {#if (metadata.projects?.length ?? 0) === 0}
          <div class="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {t('task.create.no_projects_available', {}, 'Current organization has no projects.')}
          </div>
        {/if}

        <div class="mb-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div class="rounded-2xl border border-border bg-secondary/20 p-4">
            <div class="grid gap-3 md:grid-cols-4">
              <div class="rounded-2xl border border-border bg-background/80 p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('task.create.organization', {}, 'Organization')}</p>
                <p class="mt-2 text-sm font-semibold text-foreground">{t('task.create.current_organization_value', {}, 'Current')}</p>
              </div>
              <div class="rounded-2xl border border-border bg-background/80 p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('task.create.project', {}, 'Project')}</p>
                <p class="mt-2 text-sm font-semibold text-foreground">
                  {selectedProject?.name ?? t('task.create.no_project_selected', {}, 'No project selected')}
                </p>
              </div>
              <div class="rounded-2xl border border-border bg-background/80 p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('task.create.task_access', {}, 'Task access')}</p>
                <p class="mt-2 text-sm font-semibold text-foreground">
                  {taskVisibilitySummary}
                </p>
              </div>
              <div class="rounded-2xl border border-border bg-background/80 p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('task.create.assignee', {}, 'Assignee')}</p>
                <p class="mt-2 truncate text-sm font-semibold text-foreground">
                  {selectedAssignee?.username ?? selectedAssignee?.email ?? t('task.create.no_assignee', {}, 'No assignee')}
                </p>
              </div>
            </div>
            {#if formData.project_id && loadingAssigneeGroups}
              <div class="mt-3 h-2 w-32 animate-pulse rounded-full bg-muted"></div>
            {/if}
          </div>

          <TaskReadinessCard
            {contractChecks}
            {completedContractChecks}
            {contractReadyForAssignment}
          />
        </div>

        <TaskRolePrefillPanel
          projectId={formData.project_id}
          assignedTo={formData.assigned_to}
          {requestedTaskType}
          {requestedRoleId}
          {assigneeGroups}
          {setFormData}
          bind:projectProfessionalRoleId
        />

        <CreateTaskForm
          {formData}
          {setFormData}
          {errors}
          statuses={metadata.statuses}
          priorities={metadata.priorities}
          labels={metadata.labels}
          users={scopedAssigneeUsers}
          {assigneeGroups}
          parentTasks={metadata.parentTasks ?? []}
          availableSkills={metadata.availableSkills ?? []}
          projects={metadata.projects ?? []}
          proficiencyLevels={metadata.proficiencyLevels ?? []}
          {selectedProjectVisibility}
          {formError}
        />
      </CardContent>

      <CardFooter class="flex justify-end gap-3 border-t pt-6">
        <Button variant="outline" onclick={handleCancel} disabled={submitting}>
          {t('common.cancel', {}, 'Cancel')}
        </Button>
        <Button onclick={handleSubmit} disabled={submitting || (metadata.projects?.length ?? 0) === 0}>
          {submitting ? t('common.creating', {}, 'Creating...') : t('task.add_task', {}, 'Create task')}
        </Button>
      </CardFooter>
    </Card>
  </div>
</OrganizationLayout>
