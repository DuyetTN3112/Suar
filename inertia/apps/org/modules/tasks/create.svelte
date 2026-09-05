<script lang="ts">
  import { page, router } from '@inertiajs/svelte'

  import {
    TASK_CREATE_VALIDATION_ORDER,
    validateTaskCreate,
    type TaskCreateIntent,
  } from '@/apps/shared/tasks/task_create_validation'
  import { isDocumentationTaskStatusId } from '@/apps/shared/tasks/documentation_task_status'
  import { toIsoDueAt } from '@/apps/shared/tasks/task_schedule'
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
  import { normalizeTaskFormErrors } from '@/apps/org/modules/tasks/lib/errors/task_form_errors'
  import {
    countTaskSkillsByCategory,
    formatTaskSkillCategoryViolations,
    getTaskSkillCategoryViolations,
  } from '@/apps/org/modules/tasks/lib/rules/task_skill_category_rules'
  import TaskRolePrefillPanel from '@/apps/org/modules/tasks/components/detail/task_role_prefill_panel.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null; current_project?: { id: string; name?: string | null } | null } }
    metadata: {
      statuses: { value: string; label: string; slug?: string; category?: string }[]
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
  const requestedRoleId = $derived(currentQuery.get('roleId') ?? currentQuery.get('role_id') ?? '')

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
    reviewer_visibility: 'project',
    assigned_to: '',
    reviewer_user_id: '',
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
    scope_text: '',
    out_of_scope_text: '',
    deliverables_text: '',
    quality_requirements_text: '',
    constraints_text: '',
    dependencies_text: '',
    authoring_mode: 'evidence_enabled',
    authoring_intent: 'save_draft',
    creator_confirmed: false,
    constraints_addressed: false,
    dependencies_addressed: false,
    supporting_reference_uri: '',
    supporting_reference_title: '',
    reviewer_role_code: 'org_owner',
    profile_eligibility: true,
  })

  let projectProfessionalRoleId = $state('')
  let assigneeGroups = $state<TaskCreateAssigneeGroups>({
    projectMembers: [],
    orgMembersOutsideProject: [],
  })
  let selectedProjectVisibility = $state<string | null>(null)
  let loadingAssigneeGroups = $state(false)
  let errors = $state<Record<string, string>>({})
  let formError = $state('')
  let submitting = $state(false)
  let assigneeGroupRequestKey = 0

  const pageTitle = $derived(t('task.new_task', {}, 'Create new task'))
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
  const isDocumentationItem = $derived(
    isDocumentationTaskStatusId(formData.task_status_id, metadata.statuses)
  )

  $effect(() => {
    if (!isDocumentationItem) return
    if (
      !formData.assigned_to &&
      !formData.reviewer_user_id &&
      !formData.due_date &&
      formData.estimated_time === '0' &&
      formData.authoring_mode === 'operational_only' &&
      formData.profile_eligibility === false &&
      !projectProfessionalRoleId
    ) return

    projectProfessionalRoleId = ''
    formData = {
      ...formData,
      assigned_to: '',
      reviewer_user_id: '',
      due_date: '',
      estimated_time: '0',
      authoring_mode: 'operational_only',
      profile_eligibility: false,
    }
  })

  $effect(() => {
    if (!formData.task_status_id && metadata.statuses[0]?.value) {
      formData = {
        ...formData,
        task_status_id: metadata.statuses[0].value,
      }
    }

    if (currentProjectId && formData.project_id !== currentProjectId) {
      formData = {
        ...formData,
        project_id: currentProjectId,
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

  function getCreateValidationErrors(intent: TaskCreateIntent): Record<string, string> {
    const validationErrors: Record<string, string> = {
      ...validateTaskCreate({ ...formData, is_documentation_item: isDocumentationItem }, intent, t),
    }
    const requiredSkillMixError =
      formData.required_skills.length > 0 ? validateRequiredSkillMix() : null

    if (requiredSkillMixError) validationErrors.required_skills = requiredSkillMixError

    return validationErrors
  }

  const buildPayload = (intent: TaskCreateFormData['authoring_intent']) => {
    const authoringMode = isDocumentationItem ? 'operational_only' : 'evidence_enabled'
    const resolvedIntent: TaskCreateIntent = isDocumentationItem
      ? 'save_draft'
      : intent ?? 'save_draft'
    const referenceUri = formData.supporting_reference_uri?.trim() ?? ''
    const referenceTitle = formData.supporting_reference_title?.trim() ?? ''
    const listItems = (raw: string | undefined) => parseListInput(raw ?? '').map((text) => ({ id: crypto.randomUUID(), title: text, description: text }))
    const deliverables = listItems(formData.deliverables_text).map((item) => ({ ...item, expectedFormat: null, expectedLocation: null }))
    const acceptanceCriteria = parseListInput(formData.acceptance_criteria).map((statement) => ({ id: crypto.randomUUID(), statement, verificationMethod: formData.verification_method, critical: true }))
    const dependencies = listItems(formData.dependencies_text).map((item) => ({ ...item, ownerId: null, state: 'available' }))
    const levelNumber = (value: string) => {
      const match = value.match(/\d+/)
      return match ? Number(match[0]) : null
    }
    const evidenceRequirements: Array<{
      id: string
      type: string
      title: string
      description: string
      criterionIds: string[]
      deliverableIds: string[]
      required: boolean
      privacyClassification: string
    }> = authoringMode === 'evidence_enabled'
      ? [{
          id: crypto.randomUUID(),
          type: 'review_observation',
          title: `Đánh giá kết quả: ${formData.title.trim()}`,
          description: 'Người nghiệm thu đối chiếu kết quả công việc với tiêu chí nghiệm thu và đầu ra đã chốt.',
          criterionIds: acceptanceCriteria.map((criterion) => criterion.id),
          deliverableIds: deliverables.map((deliverable) => deliverable.id),
          required: true,
          privacyClassification: 'internal',
        }]
      : []
    const evidenceCapabilities = authoringMode === 'evidence_enabled' ? formData.required_skills.map((skill) => { const level = levelNumber(skill.level); return { id: crypto.randomUUID(), capabilityId: skill.id, capabilityName: skill.name, minimumLevel: level, targetLevel: levelNumber(skill.target_level_code ?? skill.level), assessmentCeiling: levelNumber(skill.assessment_ceiling_level_code ?? ''), rubricVersionId: skill.rubric_version_id ?? null, observableBehaviours: [`Demonstrates ${skill.name} through the task deliverables.`] } }) : []

    return ({
    title: formData.title,
    description: formData.description,
    taskStatusId: formData.task_status_id,
    projectId: formData.project_id,
    taskType: formData.task_type,
    verificationMethod: formData.verification_method,
    priority: normalizeOptionalString(formData.priority),
    label: normalizeOptionalString(formData.label),
    taskVisibility: formData.task_visibility,
    assignedTo: !isDocumentationItem && resolvedIntent === 'publish'
      ? normalizeOptionalString(formData.assigned_to)
      : undefined,
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
    problemCategory: normalizeOptionalString(formData.problem_category),
    authoring: {
      mode: authoringMode,
      intent: resolvedIntent,
      idempotencyKey: `task-authoring:${crypto.randomUUID()}`,
      expectedHeadRevision: 0,
      creatorConfirmed: resolvedIntent === 'publish' && (formData.creator_confirmed ?? false),
      constraintsAddressed: formData.constraints_addressed ?? false,
      dependenciesAddressed: formData.dependencies_addressed ?? false,
      specification: {
        plainText: [formData.title, formData.description, formData.context_background, formData.acceptance_criteria]
          .filter((value) => value.trim().length > 0)
          .join('\n\n'),
      },
      workContract: {
        action: formData.task_type,
        object: formData.title,
        problemStatement: formData.context_background,
        desiredOutcome: formData.acceptance_criteria,
        roleInTask: formData.role_in_task,
        ownershipLevel: 'contributor',
        autonomyLevel: 'supervised',
        collaborationType: 'team',
        environment: 'application',
        complexityContext: {},
        impactScope: {},
        estimatedUsersAffected: 1,
        dueAt: formData.due_date
          ? (toIsoDueAt(formData.due_date) ?? new Date(Date.now() + 7 * 86_400_000).toISOString())
          : new Date(Date.now() + 7 * 86_400_000).toISOString(),
        scope: listItems(formData.scope_text),
        outOfScope: listItems(formData.out_of_scope_text),
        deliverables,
        acceptanceCriteria,
        qualityRequirements: listItems(formData.quality_requirements_text),
        constraints: listItems(formData.constraints_text),
        dependencies,
      },
      evidenceContract: {
        mode: authoringMode,
        requirements: evidenceRequirements,
        verificationMethods: formData.verification_method ? [formData.verification_method] : [],
        verifierPolicy: { reviewerIds: formData.reviewer_user_id ? [formData.reviewer_user_id] : [], reviewerRoleCodes: [], minimumReviewers: authoringMode === 'evidence_enabled' ? 1 : 0, disallowSelfReview: true },
        reviewerVisibility: formData.reviewer_visibility ?? 'project',
        capabilities: evidenceCapabilities,
        profileEligibility: authoringMode === 'evidence_enabled',
        privacyClassification: 'internal',
      },
      ...(referenceUri
        ? { supportingReferences: [{ type: 'url', uri: referenceUri, title: referenceTitle || formData.title.trim(), relevantSection: 'specification', relation: 'requirement_source', accessState: 'unknown', privacyClassification: 'internal' }] }
        : {}),
    },
    })
  }

  const handleSubmit = (intent: TaskCreateFormData['authoring_intent']) => {
    const resolvedIntent: TaskCreateIntent = isDocumentationItem
      ? 'save_draft'
      : (intent ?? 'save_draft') as TaskCreateIntent
    formData = { ...formData, authoring_intent: resolvedIntent }
    const newErrors = getCreateValidationErrors(resolvedIntent)

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      formError = ''
      return
    }

    submitting = true
    errors = {}
    formError = ''

    router.post(FRONTEND_ROUTES.TASKS, buildPayload(resolvedIntent), {
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
    const currentValidationErrors = getCreateValidationErrors(
      (formData.authoring_intent ?? 'save_draft') as TaskCreateIntent
    )
    for (const field of TASK_CREATE_VALIDATION_ORDER) {
      if (nextErrors[field] && !currentValidationErrors[field]) {
        delete nextErrors[field]
      }
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

        </div>

        {#if !isDocumentationItem && formData.task_visibility === 'project'}
          <TaskRolePrefillPanel
            projectId={formData.project_id}
            assignedTo={formData.assigned_to}
            {requestedRoleId}
            {assigneeGroups}
            {setFormData}
            bind:projectProfessionalRoleId
          />
        {/if}

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
          proficiencyLevels={metadata.proficiencyLevels ?? []}
          {selectedProjectVisibility}
          {formError}
        />
      </CardContent>

      <CardFooter class="flex justify-end gap-3 border-t pt-6">
        <Button variant="outline" onclick={handleCancel} disabled={submitting}>
          {t('common.cancel', {}, 'Cancel')}
        </Button>
        {#if isDocumentationItem}
          <Button onclick={() => handleSubmit('save_draft')} disabled={submitting || (metadata.projects?.length ?? 0) === 0}>{submitting ? t('common.creating', {}, 'Đang tạo...') : t('task.create.create_docs', {}, 'Tạo mục Docs')}</Button>
        {:else}
          <Button variant="outline" onclick={() => handleSubmit('save_draft')} disabled={submitting || (metadata.projects?.length ?? 0) === 0}>{t('task.create.save_draft', {}, 'Lưu nháp')}</Button>
          <Button onclick={() => handleSubmit('publish')} disabled={submitting || (metadata.projects?.length ?? 0) === 0}>{submitting ? t('common.creating', {}, 'Đang tạo...') : t('task.create.publish_assign', {}, 'Tạo và giao việc')}</Button>
        {/if}
      </CardFooter>
    </Card>
  </div>
</OrganizationLayout>
