<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import {
    Clock,
    CircleCheck,
    Circle,
    CircleX,
    Eye,
    Pencil,
    Sparkles,
  } from 'lucide-svelte'

  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import { updateTaskDetail } from '@/apps/user/modules/tasks/api/task_detail_api'
  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'

  import TaskDetailMetadataSidebar from '@/apps/user/modules/tasks/components/detail/task_detail_metadata_sidebar.svelte'
  import TaskDiscussionTab from '@/apps/user/modules/tasks/components/detail/task_discussion_tab.svelte'
  import TaskExecutionBrief from '@/apps/user/modules/tasks/components/detail/task_execution_brief.svelte'
  import TaskFilesTab from '@/apps/user/modules/tasks/components/detail/task_files_tab.svelte'
  import TaskDetailReadSurface from '@/apps/user/modules/tasks/components/detail/task_detail_read_surface.svelte'
  import TaskDetailFrame from '@/apps/user/modules/tasks/components/detail/task_detail_frame.svelte'
  import CreateTaskForm from '@/apps/user/modules/tasks/components/modals/create_task_form.svelte'
  import { createEmptyTaskBrief, isTaskBriefV2, taskBriefPlainText } from '@/apps/shared/tasks/task_brief_contract'
  import type { TaskCreateAssigneeGroups, TaskCreateFormData } from '@/apps/user/modules/tasks/types/create_form_types'
  import type { RoleMatchedProjectMember } from '@/apps/user/modules/tasks/lib/create_prefill'

  interface CapabilityDecision {
    allowed: boolean
    reason?: string | null
  }

  interface WorkSurfacePermissions {
    isCreator?: boolean
    isAssignee?: boolean
    canEdit?: boolean
    canAssign?: boolean
    canChangeStatus?: boolean
    canComment?: boolean
    canOpenWorkTabs?: boolean
  }

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    task: TaskDetail | null
    metadata: {
      statuses: { value: string; label: string; color?: string }[]
      labels: { value: string; label: string; color?: string }[]
      priorities: { value: string; label: string; color?: string }[]
      users: { id: string; username: string; email: string }[]
      parentTasks?: { id: string; title: string; task_status_id: string | null }[]
      availableSkills?: { id: string; name: string; categoryCode?: string | null; rubricVersionId?: string | null }[]
      proficiencyLevels?: { value: string; label: string }[]
    }
    isHydratingDetail?: boolean
    onReloadBrief?: () => void | Promise<void>
    onChangeStatus?: (task: TaskDetail, toStatusId: string) => void
    getStatusChangeDecision?: (task: TaskDetail, toStatusId: string) => CapabilityDecision
    shellMode?: 'app' | 'organization' | 'project'
    workSurfacePermissions?: WorkSurfacePermissions | null
  }

  const {
    open = false,
    onOpenChange,
    task,
    metadata,
    isHydratingDetail = false,
    onReloadBrief,
    onChangeStatus,
    getStatusChangeDecision,
    workSurfacePermissions = null,
  }: Props = $props()

  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  let filesOpen = $state(false)
  let initializedEditTaskId = $state<string | null>(null)
  let editSubmitting = $state(false)
  let editError = $state<string | null>(null)
  let editErrors = $state<Record<string, string>>({})
  let editing = $state(false)
  let editAssigneeGroups = $state<TaskCreateAssigneeGroups>({ projectMembers: [], orgMembersOutsideProject: [] })
  let editFormData = $state<TaskCreateFormData>(createEmptyEditForm())

  function createEmptyEditForm(): TaskCreateFormData {
    return {
      title: '', description: '', task_status_id: '', task_type: 'feature_development',
      verification_method: '', project_id: '', priority: '', label: '', task_visibility: 'project',
      assigned_to: '', reviewer_user_id: '', reviewer_visibility: 'project', due_date: '',
      parent_task_id: '', estimated_time: '0', required_skills: [], acceptance_criteria: '',
      context_background: '', role_in_task: '', business_domain: '', problem_category: '',
      tech_stack_text: '', learning_objectives_text: '', domain_tags_text: '', scope_text: '',
      out_of_scope_text: '', deliverables_text: '', quality_requirements_text: '', constraints_text: '',
      dependencies_text: '', authoring_mode: 'evidence_enabled', authoring_intent: 'publish',
      creator_confirmed: true, constraints_addressed: false, dependencies_addressed: false,
      supporting_reference_uri: '', supporting_reference_title: '', reviewer_role_code: 'org_owner',
      profile_eligibility: true, brief: createEmptyTaskBrief(),
    }
  }
  let editForm = $state({
    title: '',
    description: '',
    priority: '',
    label: '',
    assignedTo: '',
    dueDate: '',
    estimatedTime: '',
    actualTime: '',
    taskVisibility: 'internal' as 'project' | 'internal' | 'external' | 'all',
    taskType: '',
    acceptanceCriteria: '',
    verificationMethod: '',
    expectedDeliverables: '',
    contextBackground: '',
    impactScope: '',
    techStack: '',
    domainTags: '',
    learningObjectives: '',
    measurableOutcomes: '',
    environment: '',
    collaborationType: '',
    complexityNotes: '',
    roleInTask: '',
    autonomyLevel: '',
    problemCategory: '',
    businessDomain: '',
    estimatedUsersAffected: '',
  })

  async function reloadBrief(): Promise<void> {
    if (onReloadBrief) {
      await onReloadBrief()
      return
    }

    router.reload({ only: ['task'] })
  }

  const statusConfig: Partial<Record<string, { icon: typeof Circle; color: string; bgColor: string }>> = {
    todo: { icon: Circle, color: 'text-muted-foreground', bgColor: 'bg-secondary' },
    in_progress: { icon: Clock, color: 'text-foreground', bgColor: 'bg-muted' },
    in_review: { icon: Eye, color: 'text-primary', bgColor: 'bg-accent border border-primary/10' },
    done: { icon: CircleCheck, color: 'text-primary', bgColor: 'bg-primary/10' },
    cancelled: { icon: CircleX, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  }

  const priorityConfig: Record<string, { color: string; bgColor: string }> = {
    urgent: { color: 'text-destructive', bgColor: 'bg-destructive/10' },
    high: { color: 'text-primary', bgColor: 'bg-primary/10' },
    medium: { color: 'text-foreground', bgColor: 'bg-muted' },
    low: { color: 'text-muted-foreground', bgColor: 'bg-secondary' },
  }

  const priorityLabel = $derived(
    task ? metadata.priorities.find(p => p.value === task.priority)?.label ?? task.priority : ''
  )
  const labelLabel = $derived(
    task ? metadata.labels.find(l => l.value === task.label)?.label ?? task.label : ''
  )
  const activeStatusId = $derived((task?.task_status_id ?? task?.status) ?? '')
  const isTaskContractLocked = $derived(task?.status.trim().toLowerCase() === 'done')
  const canInlineEdit = $derived(
    Boolean(task) && Boolean(effectiveWorkSurfacePermissions?.canEdit) && !isTaskContractLocked
  )
  const isEditing = $derived(editing)

  const priorityClass = $derived(task ? priorityConfig[task.priority] : undefined)
  function hasNonEmptyArray(value: unknown): boolean {
    return Array.isArray(value) && value.length > 0
  }

  const hasContextCard = $derived(
    Boolean(
      task?.task_type ??
        task?.acceptance_criteria ??
        task?.verification_method ??
        task?.context_background ??
        (hasNonEmptyArray(task?.tech_stack) ? 'tech-stack' : null) ??
        (hasNonEmptyArray(task?.domain_tags) ? 'domain-tags' : null) ??
        task?.environment ??
        task?.collaboration_type ??
        task?.complexity_notes ??
        task?.role_in_task ??
        task?.autonomy_level ??
        task?.problem_category ??
        task?.business_domain ??
        task?.estimated_users_affected ??
        task?.resolved_brief ??
        (hasNonEmptyArray(task?.expected_deliverables) ? 'deliverables' : null)
    )
  )

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    const parsed = new Date(dateStr)
    if (Number.isNaN(parsed.getTime())) return dateStr
    return new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed)
  }

  function formatRelativeDate(dateStr: string | null): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days < -1) {
      const count = Math.abs(days)
      return t('task.detail_panel.relative_overdue_days', { count }, `${count} days overdue`)
    }
    if (days === -1) return t('task.detail_panel.relative_overdue_yesterday', {}, 'Overdue yesterday')
    if (days === 0) return t('task.detail_panel.relative_today', {}, 'Today')
    if (days === 1) return t('task.detail_panel.relative_tomorrow', {}, 'Tomorrow')
    return t('task.detail_panel.relative_days_remaining', { count: days }, `${days} days left`)
  }

  const isOverdue = $derived(task?.due_date ? new Date(task.due_date).getTime() < Date.now() : false)
  const currentUserId = $derived(
    (page as { props: { auth?: { user?: { id?: string } } } }).props.auth?.user?.id ?? null
  )
  const taskPermissions = $derived((task?.permissions ?? null) as WorkSurfacePermissions | null)
  const effectiveWorkSurfacePermissions = $derived(workSurfacePermissions ?? taskPermissions)
  const canOpenWorkTabs = $derived(
    effectiveWorkSurfacePermissions?.canOpenWorkTabs ??
      Boolean(
        effectiveWorkSurfacePermissions?.isCreator ||
          effectiveWorkSurfacePermissions?.isAssignee ||
          effectiveWorkSurfacePermissions?.canEdit ||
          effectiveWorkSurfacePermissions?.canAssign ||
          effectiveWorkSurfacePermissions?.canChangeStatus ||
          (currentUserId &&
            (task?.creator_id === currentUserId ||
              task?.assigned_to === currentUserId ||
              task?.assignee?.id === currentUserId))
      )
  )
  // This panel can only open for a task already visible on the board. Keep
  // discussion available for that viewer even when an older board payload
  // omits the newer canComment capability field.
  // A board viewer may discuss the task; marketplace previews are read-only.
  // Keep the legacy fallback for board payloads that predate canComment.
  const canOpenDiscussion = $derived(
    Boolean(task) && effectiveWorkSurfacePermissions?.canComment !== false
  )
  function handleStatusChange(newStatus: string) {
    if (!task || !onChangeStatus) return

    const decision = getStatusChangeDecision?.(task, newStatus) ?? { allowed: true }
    if (!decision.allowed) return

    onChangeStatus(task, newStatus)
  }

  function getSidebarStatusChangeDecision(newStatus: string): CapabilityDecision {
    if (!task) return { allowed: false, reason: null }
    return getStatusChangeDecision?.(task, newStatus) ?? { allowed: true }
  }

  function toEditLines(value: unknown): string {
    if (!Array.isArray(value)) return ''
    return value.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>
        return String(record.title ?? record.text ?? record.description ?? '')
      }
      return ''
    }).filter(Boolean).join('\n')
  }

  function buildEditFormData(currentTask: TaskDetail): TaskCreateFormData {
    const resolved = currentTask.resolved_brief?.resolvedContract
    const evidence = resolved?.evidence
    const richContent = resolved?.specification?.richContent
    const brief = isTaskBriefV2(richContent) ? richContent : createEmptyTaskBrief()
    const work = resolved?.work
    const reviewerId = evidence?.verifierPolicy?.reviewerIds?.[0] ?? ''
    const capabilities = evidence?.capabilities ?? []

    return {
      ...createEmptyEditForm(),
      title: currentTask.title,
      description: currentTask.description ?? '',
      task_status_id: currentTask.task_status_id ?? currentTask.status,
      task_type: currentTask.task_type ?? work?.action ?? 'feature_development',
      verification_method: currentTask.verification_method ?? evidence?.verificationMethods?.[0] ?? '',
      project_id: currentTask.project_id,
      priority: currentTask.priority ?? '',
      label: currentTask.label ?? '',
      task_visibility: currentTask.task_visibility ?? 'project',
      reviewer_visibility: evidence?.reviewerVisibility ?? 'project',
      assigned_to: currentTask.assigned_to ?? '',
      reviewer_user_id: reviewerId,
      due_date: currentTask.due_date?.slice(0, 10) ?? '',
      parent_task_id: currentTask.parent_task_id ?? '',
      estimated_time: String(currentTask.estimated_time ?? 0),
      required_skills: (currentTask.required_skills_rel ?? []).map((skill) => {
        const capability = capabilities.find((item) => item.capabilityId === (skill.skill_id ?? skill.id))
        return {
          id: skill.skill_id ?? skill.id,
          name: skill.skill?.skill_name ?? skill.skill_id ?? skill.id,
          level: skill.required_public_proficiency_code ?? skill.level ?? '',
          rubric_version_id: capability?.rubricVersionId ?? null,
          minimum_level_code: capability?.minimumLevel == null ? null : `l${capability.minimumLevel}`,
          target_level_code: capability?.targetLevel == null ? null : `l${capability.targetLevel}`,
          assessment_ceiling_level_code: capability?.assessmentCeiling == null ? null : `l${capability.assessmentCeiling}`,
          is_mandatory: true,
        }
      }),
      acceptance_criteria: currentTask.acceptance_criteria ?? work?.desiredOutcome ?? '',
      context_background: currentTask.context_background ?? work?.problemStatement ?? '',
      role_in_task: currentTask.role_in_task ?? work?.roleInTask ?? '',
      business_domain: currentTask.business_domain ?? '',
      problem_category: currentTask.problem_category ?? '',
      tech_stack_text: (currentTask.tech_stack ?? []).join(', '),
      learning_objectives_text: (currentTask.learning_objectives ?? []).join(', '),
      domain_tags_text: (currentTask.domain_tags ?? []).join(', '),
      scope_text: brief.scope.length ? brief.scope.map((item) => item.text).join('\n') : toEditLines(work?.scope),
      out_of_scope_text: brief.outOfScope.length ? brief.outOfScope.map((item) => item.text).join('\n') : toEditLines(work?.outOfScope),
      deliverables_text: brief.deliverables.length ? brief.deliverables.map((item) => [item.outputType, item.locationOrRecipient, item.minimumState].filter(Boolean).join(' — ')).join('\n') : toEditLines(work?.deliverables),
      quality_requirements_text: brief.qualityRequirements.map((item) => [item.property, item.appliesTo, item.observableCheck].filter(Boolean).join(' — ')).join('\n') || toEditLines(work?.qualityRequirements),
      constraints_text: brief.constraints.length ? brief.constraints.map((item) => item.text).join('\n') : toEditLines(work?.constraints),
      dependencies_text: brief.dependencies.length ? brief.dependencies.map((item) => [item.dependency, item.owner, item.state].filter(Boolean).join(' — ')).join('\n') : toEditLines(work?.dependencies),
      authoring_mode: evidence?.mode ?? 'operational_only',
      authoring_intent: currentTask.resolved_brief?.state === 'draft' ? 'save_draft' : 'publish',
      creator_confirmed: currentTask.resolved_brief?.state !== 'draft',
      profile_eligibility: evidence?.profileEligibility ?? true,
      brief,
    }
  }

  async function loadEditAssigneeGroups(projectId: string): Promise<void> {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}`)
      const payload = await response.json() as { data?: { members?: Array<{ userId: string; username: string; email: string; role?: string; professionalRoleName?: string | null; projectProfessionalRoleId?: string | null }> } }
      const projectMembers: RoleMatchedProjectMember[] = (payload.data?.members ?? []).map((member) => ({
        id: member.userId,
        username: member.username,
        email: member.email,
        governanceRole: member.role ?? null,
        deliveryRoleName: member.professionalRoleName ?? null,
        projectProfessionalRoleId: member.projectProfessionalRoleId ?? null,
      }))
      editAssigneeGroups = {
        projectMembers,
        orgMembersOutsideProject: metadata.users
          .filter((user) => !projectMembers.some((member) => member.id === user.id))
          .map((user) => ({ id: user.id, username: user.username, email: user.email })),
      }
    } catch {
      const currentAssignee = metadata.users.find((user) => user.id === task?.assigned_to)
      editAssigneeGroups = {
        projectMembers: currentAssignee ? [{ ...currentAssignee, governanceRole: null, deliveryRoleName: null }] : [],
        orgMembersOutsideProject: [],
      }
    }
  }

  function startEditing(): void {
    if (!task) return
    editError = null
    editErrors = {}
    editing = true
    editAssigneeGroups = {
      projectMembers: metadata.users.map((user) => ({ ...user, governanceRole: null, deliveryRoleName: null })),
      orgMembersOutsideProject: [],
    }
    editFormData = buildEditFormData(task)
    void loadEditAssigneeGroups(task.project_id)
    editForm = {
      title: task.title,
      description: task.description ?? '',
      priority: task.priority ?? '',
      label: task.label ?? '',
      assignedTo: task.assigned_to ?? '',
      dueDate: task.due_date?.slice(0, 10) ?? '',
      estimatedTime: task.estimated_time == null ? '' : String(task.estimated_time),
      actualTime: task.actual_time == null ? '' : String(task.actual_time),
      taskVisibility: task.task_visibility ?? 'internal',
      taskType: task.task_type ?? '',
      acceptanceCriteria: task.acceptance_criteria ?? '',
      verificationMethod: task.verification_method ?? '',
      expectedDeliverables: toLineList(task['expected_deliverables']),
      contextBackground: task.context_background ?? '',
      impactScope: typeof task['impact_scope'] === 'string' ? task['impact_scope'] : '',
      techStack: (task.tech_stack ?? []).join(', '),
      domainTags: (task.domain_tags ?? []).join(', '),
      learningObjectives: (task.learning_objectives ?? []).join(', '),
      measurableOutcomes: toLineList(task['measurable_outcomes']),
      environment: task.environment ?? '',
      collaborationType: task.collaboration_type ?? '',
      complexityNotes: task.complexity_notes ?? '',
      roleInTask: task.role_in_task ?? '',
      autonomyLevel: task.autonomy_level ?? '',
      problemCategory: task.problem_category ?? '',
      businessDomain: task.business_domain ?? '',
      estimatedUsersAffected: task.estimated_users_affected == null ? '' : String(task.estimated_users_affected),
    }
    initializedEditTaskId = task.id
  }

  function cancelEditing(): void {
    editing = false
    editErrors = {}
    editError = null
  }

  function toLineList(value: unknown): string {
    if (!Array.isArray(value)) return ''
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && typeof (item as { title?: unknown }).title === 'string') {
          return (item as { title: string }).title
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }

  function parseList(value: string): string[] {
    return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
  }

  $effect(() => {
    if (!task) {
      initializedEditTaskId = null
      editing = false
    }
  })

  function valueFromInputEvent(event: unknown): string {
    return (event as { currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement }).currentTarget.value
  }

  async function saveTaskEdits(): Promise<void> {
    if (!task || !editFormData.title.trim()) {
      editError = t('task.edit.title_required', {}, 'Title is required')
      return
    }

    const estimatedTime = editFormData.estimated_time.trim()
    const parsedEstimatedTime = estimatedTime === '' ? undefined : Number(estimatedTime)
    if (
      (parsedEstimatedTime !== undefined && (!Number.isFinite(parsedEstimatedTime) || parsedEstimatedTime < 0))
    ) {
      editError = t('task.edit.estimated_time_invalid', {}, 'Estimated time must be a non-negative number')
      return
    }

    const items = (value: string | undefined) => parseList(value ?? '').map((title) => ({
      id: crypto.randomUUID(), title, description: title,
    }))
    const evidence = task.resolved_brief?.resolvedContract?.evidence
    const authoringMode = editFormData.authoring_mode ?? evidence?.mode ?? 'operational_only'
    const intent = editFormData.authoring_intent ?? 'publish'
    const authoring = {
      mode: authoringMode,
      intent,
      idempotencyKey: `task-authoring-update:${crypto.randomUUID()}`,
      expectedHeadRevision: task.resolved_brief?.headRevision ?? 0,
      creatorConfirmed: intent === 'publish',
      constraintsAddressed: editFormData.constraints_addressed ?? false,
      dependenciesAddressed: editFormData.dependencies_addressed ?? false,
      specification: {
        plainText: [editFormData.title, editFormData.description, editFormData.context_background, editFormData.acceptance_criteria, taskBriefPlainText(editFormData.brief)].filter(Boolean).join('\n\n'),
        richContent: editFormData.brief,
        sections: [],
      },
      workContract: {
        action: editFormData.task_type,
        object: editFormData.title,
        problemStatement: editFormData.context_background,
        desiredOutcome: editFormData.acceptance_criteria,
        roleInTask: editFormData.role_in_task,
        ownershipLevel: 'contributor',
        autonomyLevel: 'supervised',
        collaborationType: 'team',
        environment: 'application',
        complexityContext: {},
        impactScope: {},
        estimatedUsersAffected: 1,
        dueAt: editFormData.due_date ? `${editFormData.due_date}T00:00:00.000Z` : null,
        scope: items(editFormData.scope_text),
        outOfScope: items(editFormData.out_of_scope_text),
        deliverables: items(editFormData.deliverables_text),
        acceptanceCriteria: editFormData.brief.acceptanceCriteria.length
          ? editFormData.brief.acceptanceCriteria.map((criterion) => ({
              id: criterion.id,
              statement: [criterion.condition, criterion.action, criterion.observableResult].filter(Boolean).join(' — '),
              verificationMethod: editFormData.verification_method,
              critical: true,
            }))
          : parseList(editFormData.acceptance_criteria).map((statement) => ({
              id: crypto.randomUUID(), statement, verificationMethod: editFormData.verification_method, critical: true,
            })),
        qualityRequirements: items(editFormData.quality_requirements_text),
        constraints: items(editFormData.constraints_text),
        dependencies: items(editFormData.dependencies_text).map((item) => ({ ...item, ownerId: null, state: 'available' })),
      },
      evidenceContract: {
        mode: authoringMode,
        requirements: evidence?.requirements ?? [],
        verificationMethods: editFormData.verification_method ? [editFormData.verification_method] : (evidence?.verificationMethods ?? []),
        verifierPolicy: {
          reviewerIds: editFormData.reviewer_user_id ? [editFormData.reviewer_user_id] : (evidence?.verifierPolicy?.reviewerIds ?? []),
          reviewerRoleCodes: evidence?.verifierPolicy?.reviewerRoleCodes ?? [],
          minimumReviewers: authoringMode === 'evidence_enabled' ? Math.max(1, evidence?.verifierPolicy?.minimumReviewers ?? 1) : 0,
          disallowSelfReview: evidence?.verifierPolicy?.disallowSelfReview ?? true,
        },
        reviewerVisibility: editFormData.reviewer_visibility ?? evidence?.reviewerVisibility ?? editFormData.task_visibility,
        capabilities: editFormData.required_skills.map((skill) => ({
          id: skill.id,
          capabilityId: skill.id,
          capabilityName: skill.name,
          minimumLevel: Number(String(skill.minimum_level_code ?? skill.level).replace(/[^0-9]/g, '')) || null,
          targetLevel: Number(String(skill.target_level_code ?? '').replace(/[^0-9]/g, '')) || null,
          assessmentCeiling: Number(String(skill.assessment_ceiling_level_code ?? '').replace(/[^0-9]/g, '')) || null,
          rubricVersionId: skill.rubric_version_id ?? null,
          observableBehaviours: [],
        })),
        profileEligibility: authoringMode === 'evidence_enabled' && (editFormData.profile_eligibility ?? false),
        privacyClassification: evidence?.privacyClassification ?? 'internal',
      },
    }

    editSubmitting = true
    editError = null
    editErrors = {}
    try {
      await updateTaskDetail(task.id, {
        title: editFormData.title.trim(),
        description: editFormData.description,
        priority: editFormData.priority || null,
        label: editFormData.label || null,
        assigned_to: editFormData.assigned_to || null,
        due_date: editFormData.due_date || null,
        ...(parsedEstimatedTime === undefined ? {} : { estimated_time: parsedEstimatedTime }),
        task_visibility: editFormData.task_visibility,
        task_type: editFormData.task_type,
        acceptance_criteria: editFormData.acceptance_criteria,
        verification_method: editFormData.verification_method,
        expected_deliverables: items(editFormData.deliverables_text),
        context_background: editFormData.context_background,
        tech_stack: parseList(editFormData.tech_stack_text),
        domain_tags: parseList(editFormData.domain_tags_text),
        learning_objectives: parseList(editFormData.learning_objectives_text),
        role_in_task: editFormData.role_in_task,
        problem_category: editFormData.problem_category,
        authoring,
      })
      editing = false
      initializedEditTaskId = task.id
      await reloadBrief()
    } catch (error: unknown) {
      editError = error instanceof Error ? error.message : t('task.edit.save_failed', {}, 'Could not save task changes')
    } finally {
      editSubmitting = false
    }
  }

</script>

<Dialog {open} onOpenChange={onOpenChange}>
  <DialogContent class="h-[92vh] max-h-[92vh] w-[96vw] max-w-6xl p-0 overflow-hidden">
    {#if task}
      <div class="flex h-full flex-col">
        {#if isEditing}
          <div class="flex h-full min-h-0 flex-col bg-background" data-testid="task-edit-frame">
            <header class="shrink-0 border-b bg-muted/10 px-5 py-5 sm:px-6">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common.edit', {}, 'Chỉnh sửa task')}</p>
                  <h2 class="mt-1 text-xl font-bold">{task.title}</h2>
                </div>
                <Button type="button" variant="outline" onclick={cancelEditing} disabled={editSubmitting}>{t('common.cancel', {}, 'Hủy')}</Button>
              </div>
            </header>
            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {#if editError}
                <div class="mb-4 rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{editError}</div>
              {/if}
              <CreateTaskForm
                formData={editFormData}
                setFormData={(updater) => { editFormData = updater(editFormData) }}
                errors={editErrors}
                formError={editError ?? ''}
                statuses={metadata.statuses}
                priorities={metadata.priorities}
                labels={metadata.labels}
                users={metadata.users}
                assigneeGroups={editAssigneeGroups}
                parentTasks={metadata.parentTasks ?? []}
                availableSkills={metadata.availableSkills ?? []}
                proficiencyLevels={metadata.proficiencyLevels ?? []}
              />
            </div>
            <footer class="shrink-0 border-t bg-background px-5 py-4 sm:px-6">
              <div class="flex justify-end gap-2">
                <Button type="button" variant="outline" onclick={cancelEditing} disabled={editSubmitting}>{t('common.cancel', {}, 'Hủy')}</Button>
                <Button type="button" onclick={() => { void saveTaskEdits() }} disabled={editSubmitting}>
                  {editSubmitting ? t('common.saving', {}, 'Đang lưu...') : t('common.save_changes', {}, 'Lưu thay đổi')}
                </Button>
              </div>
            </footer>
          </div>
        {:else}
        <TaskDetailFrame
          {task}
          {metadata}
          {currentUserId}
          workSurfacePermissions={effectiveWorkSurfacePermissions}
          onReloadBrief={reloadBrief}
          onChangeStatus={handleStatusChange}
          getStatusChangeDecision={getStatusChangeDecision}
          actionLabel={canInlineEdit ? t('common.edit', {}, 'Edit') : undefined}
          onAction={canInlineEdit ? startEditing : undefined}
          lockedMessage={effectiveWorkSurfacePermissions?.canEdit && isTaskContractLocked
            ? t('task.edit.locked_after_review', {}, 'Task đã hoàn thành hoặc vào review nên thông tin đánh giá đã được khóa.')
            : isHydratingDetail
              ? t('task.detail_panel.hydrating_detail', {}, 'Loading full detail...')
              : undefined}
        />
        {/if}
        {#if false}
        <header class="border-b p-5">
          <div class="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span class="rounded bg-muted px-2 py-1 font-mono">{task.id.slice(0, 8)}</span>
            <Sparkles class="h-3.5 w-3.5" />
            <span>{t('task.detail_panel.issue_label', {}, 'Issue')}</span>
          </div>

          <h2 class="text-2xl font-bold leading-tight">{task.title}</h2>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            {#if canInlineEdit}
              <Button size="sm" variant="outline" onclick={() => router.visit(`/tasks/${task.id}/edit`)}>
                <Pencil class="mr-1 h-3.5 w-3.5" />
                {t('common.edit', {}, 'Edit')}
              </Button>
            {:else if effectiveWorkSurfacePermissions?.canEdit && isTaskContractLocked}
              <span class="text-xs text-muted-foreground">{t('task.edit.locked_after_review', {}, 'Task đã hoàn thành hoặc vào review nên thông tin đánh giá đã được khóa.')}</span>
            {/if}
              {#if isHydratingDetail}
                <span class="text-xs text-muted-foreground">{t('task.detail_panel.hydrating_detail', {}, 'Loading full detail...')}</span>
              {/if}
            </div>
          </header>

        <TaskDetailReadSurface
          {task}
          {metadata}
          {currentUserId}
          workSurfacePermissions={effectiveWorkSurfacePermissions}
          onReloadBrief={reloadBrief}
          onChangeStatus={handleStatusChange}
          getStatusChangeDecision={getStatusChangeDecision}
        />

        <!-- Kept temporarily as unreachable source while the dedicated editor is
             extracted; the shared surface above is now the only read UI. -->
        {#if false}
        <div class="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_280px]">
          <section class="min-w-0 overflow-y-auto p-5">
            {#if isEditing}
              <form class="space-y-5" onsubmit={(event) => { event.preventDefault(); void saveTaskEdits() }}>
                <div class="space-y-2">
                  <Label for="task-edit-title">{t('task.title', {}, 'Title')}</Label>
                  <Input id="task-edit-title" value={editForm.title} oninput={(event) => { editForm = { ...editForm, title: valueFromInputEvent(event) } }} />
                </div>
                <div class="space-y-2">
                  <Label for="task-edit-description">{t('task.description', {}, 'Description')}</Label>
                  <Textarea id="task-edit-description" rows={6} value={editForm.description} oninput={(event) => { editForm = { ...editForm, description: valueFromInputEvent(event) } }} />
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="space-y-2">
                    <Label for="task-edit-priority">{t('task.priority', {}, 'Priority')}</Label>
                    <select id="task-edit-priority" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={editForm.priority} onchange={(event) => { editForm = { ...editForm, priority: event.currentTarget.value } }}>
                      <option value="">{t('common.none', {}, 'None')}</option>
                      {#each metadata.priorities as priority (priority.value)}
                        <option value={priority.value}>{priority.label}</option>
                      {/each}
                    </select>
                  </div>
                  <div class="space-y-2">
                    <Label for="task-edit-label">{t('task.label', {}, 'Label')}</Label>
                    <select id="task-edit-label" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={editForm.label} onchange={(event) => { editForm = { ...editForm, label: event.currentTarget.value } }}>
                      <option value="">{t('common.none', {}, 'None')}</option>
                      {#each metadata.labels as label (label.value)}
                        <option value={label.value}>{label.label}</option>
                      {/each}
                    </select>
                  </div>
                  <div class="space-y-2">
                    <Label for="task-edit-assignee">{t('task.assigned_to', {}, 'Assigned to')}</Label>
                    <select id="task-edit-assignee" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={editForm.assignedTo} onchange={(event) => { editForm = { ...editForm, assignedTo: event.currentTarget.value } }}>
                      <option value="">{t('task.unassigned', {}, 'Unassigned')}</option>
                      {#each metadata.users as user (user.id)}
                        <option value={user.id}>{user.username || user.email}</option>
                      {/each}
                    </select>
                  </div>
                  <div class="space-y-2">
                    <Label for="task-edit-due-date">{t('task.due_date', {}, 'Due date')}</Label>
                    <Input id="task-edit-due-date" type="date" value={editForm.dueDate} oninput={(event) => { editForm = { ...editForm, dueDate: valueFromInputEvent(event) } }} />
                  </div>
                  <div class="space-y-2">
                    <Label for="task-edit-estimated-time">{t('task.estimated_time', {}, 'Estimated time')}</Label>
                    <Input id="task-edit-estimated-time" type="number" min="0" value={editForm.estimatedTime} oninput={(event) => { editForm = { ...editForm, estimatedTime: valueFromInputEvent(event) } }} />
                  </div>
                  <div class="space-y-2">
                    <Label for="task-edit-actual-time">{t('task.actual_time', {}, 'Actual time')}</Label>
                    <Input id="task-edit-actual-time" type="number" min="0" value={editForm.actualTime} oninput={(event) => { editForm = { ...editForm, actualTime: valueFromInputEvent(event) } }} />
                  </div>
                  <div class="space-y-2">
                    <Label for="task-edit-visibility">{t('task.edit.task_access', {}, 'Task access')}</Label>
                    <select id="task-edit-visibility" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={editForm.taskVisibility} onchange={(event) => { editForm = { ...editForm, taskVisibility: event.currentTarget.value as typeof editForm.taskVisibility } }}>
                      <option value="project">{t('task.edit.visibility_project', {}, 'Project only')}</option><option value="internal">{t('task.edit.visibility_internal', {}, 'Entire organization')}</option><option value="external">{t('task.edit.visibility_external', {}, 'Marketplace')}</option><option value="all">{t('task.edit.visibility_all', {}, 'Organization + Marketplace')}</option>
                    </select>
                  </div>
                </div>
                <section class="space-y-4 border-t pt-5">
                  <div><h3 class="text-base font-semibold">{t('task.edit.context_tab', {}, 'Acceptance & context')}</h3><p class="mt-1 text-sm text-muted-foreground">{t('task.edit.inline_context_help', {}, 'Đây là hợp đồng công việc do người giao việc duy trì; không phải yêu cầu người thực hiện tự nộp bằng chứng.')}</p></div>
                  <div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><Label for="task-edit-type">{t('task.edit.task_type', {}, 'Task type')}</Label><Input id="task-edit-type" value={editForm.taskType} oninput={(event) => { editForm = { ...editForm, taskType: valueFromInputEvent(event) } }} /></div><div class="space-y-2"><Label for="task-edit-verification">{t('task.edit.verification_method', {}, 'Verification method')}</Label><Input id="task-edit-verification" value={editForm.verificationMethod} oninput={(event) => { editForm = { ...editForm, verificationMethod: valueFromInputEvent(event) } }} /></div></div>
                  <div class="space-y-2"><Label for="task-edit-context">{t('task.edit.context_background', {}, 'Business context')}</Label><Textarea id="task-edit-context" rows={4} value={editForm.contextBackground} oninput={(event) => { editForm = { ...editForm, contextBackground: valueFromInputEvent(event) } }} /></div>
                  <div class="space-y-2"><Label for="task-edit-impact">{t('task.edit.impact_scope', {}, 'Impact scope')}</Label><Textarea id="task-edit-impact" rows={3} value={editForm.impactScope} oninput={(event) => { editForm = { ...editForm, impactScope: valueFromInputEvent(event) } }} /></div>
                  <div class="space-y-2"><Label for="task-edit-acceptance">{t('task.edit.acceptance_criteria', {}, 'Acceptance criteria')}</Label><Textarea id="task-edit-acceptance" rows={4} value={editForm.acceptanceCriteria} oninput={(event) => { editForm = { ...editForm, acceptanceCriteria: valueFromInputEvent(event) } }} /></div>
                  <div class="space-y-2"><Label for="task-edit-deliverables">{t('task.edit.expected_outputs', {}, 'Expected outputs')}</Label><Textarea id="task-edit-deliverables" rows={3} value={editForm.expectedDeliverables} oninput={(event) => { editForm = { ...editForm, expectedDeliverables: valueFromInputEvent(event) } }} /><p class="text-xs text-muted-foreground">{t('task.edit.expected_outputs_help', {}, 'One expected output per line. This defines the work contract, not proof required from the assignee.')}</p></div>
                  <div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><Label for="task-edit-stack">{t('task.edit.tech_stack', {}, 'Tech stack')}</Label><Input id="task-edit-stack" value={editForm.techStack} oninput={(event) => { editForm = { ...editForm, techStack: valueFromInputEvent(event) } }} /></div><div class="space-y-2"><Label for="task-edit-tags">{t('task.edit.domain_tags', {}, 'Domain tags')}</Label><Input id="task-edit-tags" value={editForm.domainTags} oninput={(event) => { editForm = { ...editForm, domainTags: valueFromInputEvent(event) } }} /></div><div class="space-y-2"><Label for="task-edit-environment">{t('task.edit.environment', {}, 'Environment')}</Label><Input id="task-edit-environment" value={editForm.environment} oninput={(event) => { editForm = { ...editForm, environment: valueFromInputEvent(event) } }} /></div><div class="space-y-2"><Label for="task-edit-collaboration">{t('task.edit.collaboration_type', {}, 'Collaboration type')}</Label><Input id="task-edit-collaboration" value={editForm.collaborationType} oninput={(event) => { editForm = { ...editForm, collaborationType: valueFromInputEvent(event) } }} /></div></div>
                  <div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><Label for="task-edit-learning">{t('task.edit.learning_objectives', {}, 'Learning objectives')}</Label><Textarea id="task-edit-learning" rows={3} value={editForm.learningObjectives} oninput={(event) => { editForm = { ...editForm, learningObjectives: valueFromInputEvent(event) } }} /></div><div class="space-y-2"><Label for="task-edit-outcomes">{t('task.edit.measurable_outcomes', {}, 'Measurable outcomes')}</Label><Textarea id="task-edit-outcomes" rows={3} value={editForm.measurableOutcomes} oninput={(event) => { editForm = { ...editForm, measurableOutcomes: valueFromInputEvent(event) } }} /></div></div>
                  <div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><Label for="task-edit-role">{t('task.edit.role_in_task', {}, 'Role in task')}</Label><Input id="task-edit-role" value={editForm.roleInTask} oninput={(event) => { editForm = { ...editForm, roleInTask: valueFromInputEvent(event) } }} /></div><div class="space-y-2"><Label for="task-edit-autonomy">{t('task.edit.autonomy_level', {}, 'Autonomy level')}</Label><Input id="task-edit-autonomy" value={editForm.autonomyLevel} oninput={(event) => { editForm = { ...editForm, autonomyLevel: valueFromInputEvent(event) } }} /></div><div class="space-y-2"><Label for="task-edit-problem">{t('task.edit.problem_category', {}, 'Problem category')}</Label><Input id="task-edit-problem" value={editForm.problemCategory} oninput={(event) => { editForm = { ...editForm, problemCategory: valueFromInputEvent(event) } }} /></div><div class="space-y-2"><Label for="task-edit-domain">{t('task.edit.business_domain', {}, 'Business domain')}</Label><Input id="task-edit-domain" value={editForm.businessDomain} oninput={(event) => { editForm = { ...editForm, businessDomain: valueFromInputEvent(event) } }} /></div><div class="space-y-2"><Label for="task-edit-users-affected">{t('task.edit.estimated_users_affected', {}, 'Estimated users affected')}</Label><Input id="task-edit-users-affected" type="number" min="0" value={editForm.estimatedUsersAffected} oninput={(event) => { editForm = { ...editForm, estimatedUsersAffected: valueFromInputEvent(event) } }} /></div><div class="space-y-2"><Label for="task-edit-complexity">{t('task.edit.complexity_notes', {}, 'Complexity notes')}</Label><Input id="task-edit-complexity" value={editForm.complexityNotes} oninput={(event) => { editForm = { ...editForm, complexityNotes: valueFromInputEvent(event) } }} /></div></div>
                </section>
                {#if editError}
                  <p class="text-sm text-destructive" role="alert">{editError}</p>
                {/if}
                <div class="flex flex-wrap justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="outline" onclick={cancelEditing} disabled={editSubmitting}>{t('common.cancel', {}, 'Cancel')}</Button>
                  <Button type="submit" disabled={editSubmitting}>{editSubmitting ? t('common.saving', {}, 'Saving...') : t('common.save_changes', {}, 'Save changes')}</Button>
                </div>
              </form>
            {:else}
            <div class="space-y-6">
              <div>
                <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('task.description', {}, 'Description')}
                </h3>
                {#if task.description}
                  <div class="rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </div>
                {:else}
                  <div class="rounded-lg border border-dashed p-4 text-sm italic text-muted-foreground">
                    {t('task.no_description', {}, 'No description')}
                  </div>
                {/if}
              </div>

              {#if task.parentTask}
                <div>
                  <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('task.parent_task', {}, 'Parent task')}
                  </h3>
                  <div class="rounded-lg border p-3 text-sm">
                    <span class="font-medium">{task.parentTask.title}</span>
                    <Badge variant="outline" class="ml-2 text-[10px]">{task.parentTask.status}</Badge>
                  </div>
                </div>
              {/if}

              {#if task.childTasks && task.childTasks.length > 0}
                <div>
                  <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('task.child_tasks', {}, 'Child tasks')} ({task.childTasks.length})
                  </h3>
                  <div class="space-y-2">
                    {#each task.childTasks as child (child.id)}
                      <div class="flex items-center justify-between rounded-lg border p-3 text-sm">
                        <span class="truncate pr-2">{child.title}</span>
                        <Badge variant="outline" class="shrink-0 text-[10px]">{child.status}</Badge>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if hasContextCard}
                <TaskExecutionBrief
                  task={task}
                  resolvedBrief={task.resolved_brief}
                  onReloadBrief={reloadBrief}
                />
              {/if}

              {#if task.id && canOpenDiscussion}
                <details class="rounded-lg border bg-background/70 p-3" data-testid="task-detail-discussion">
                  <summary class="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-1 py-1 text-left">
                    <span class="font-semibold">{t('task.discussion_tab.title', {}, 'Task discussion')}</span>
                    <span class="text-xs text-muted-foreground">{t('common.expand', {}, 'Open when needed')}</span>
                  </summary>
                  <div class="pt-3">
                    <TaskDiscussionTab taskId={task.id} {currentUserId} />
                  </div>
                </details>
              {/if}

              {#if task.id && canOpenWorkTabs}
                <section class="rounded-lg border bg-background/70 p-4" data-testid="task-detail-files">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-3 text-left"
                    aria-expanded={filesOpen}
                    onclick={() => { filesOpen = !filesOpen }}
                  >
                    <span class="font-semibold">{t('task.files_tab.title', {}, 'Attachments')}</span>
                    <span class="text-xs text-muted-foreground">
                      {filesOpen ? t('common.collapse', {}, 'Collapse') : t('common.expand', {}, 'Open when needed')}
                    </span>
                  </button>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {t('task.files_tab.supporting_help', {}, 'Supporting task material; not mandatory proof for moving status.')}
                  </p>
                  {#if filesOpen}
                    <div class="mt-4">
                      <TaskFilesTab taskId={task.id} {currentUserId} />
                    </div>
                  {/if}
                </section>
              {/if}
            </div>
            {/if}
          </section>

          <TaskDetailMetadataSidebar
            {task}
            {metadata}
            {activeStatusId}
            {priorityLabel}
            {labelLabel}
            {isOverdue}
            {formatDate}
            {formatRelativeDate}
            onStatusChange={handleStatusChange}
            getStatusChangeDecision={getSidebarStatusChangeDecision}
            {statusConfig}
            {priorityClass}
          />
        </div>
        {/if}
        {/if}
      </div>
    {/if}
  </DialogContent>
</Dialog>
