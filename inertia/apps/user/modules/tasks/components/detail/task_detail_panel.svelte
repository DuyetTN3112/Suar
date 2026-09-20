<script lang="ts">
  import { page, router } from '@inertiajs/svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import { updateTaskDetail } from '@/apps/user/modules/tasks/api/task_detail_api'
  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'

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

  async function reloadBrief(): Promise<void> {
    if (onReloadBrief) {
      await onReloadBrief()
      return
    }

    router.reload({ only: ['task'] })
  }

  const currentUserId = $derived(
    (page as { props: { auth?: { user?: { id?: string } } } }).props.auth?.user?.id ?? null
  )
  const taskPermissions = $derived((task?.permissions ?? null) as WorkSurfacePermissions | null)
  const effectiveWorkSurfacePermissions = $derived(workSurfacePermissions ?? taskPermissions)

  const isTaskContractLocked = $derived(task?.status.trim().toLowerCase() === 'done')
  const canInlineEdit = $derived(
    Boolean(task) && Boolean(effectiveWorkSurfacePermissions?.canEdit) && !isTaskContractLocked
  )
  const isEditing = $derived(editing)

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
  }

  function cancelEditing(): void {
    editing = false
    editErrors = {}
    editError = null
  }

  function updateEditFormData(updater: (prev: TaskCreateFormData) => TaskCreateFormData): void {
    editFormData = updater(editFormData)
  }

  function parseList(value: string): string[] {
    return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
  }

  $effect(() => {
    if (!task) {
      editing = false
    }
  })

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
                setFormData={updateEditFormData}
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
          onChangeStatus={onChangeStatus}
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
      </div>
    {/if}
  </DialogContent>
</Dialog>
