<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardFooter from '@/apps/user/shared/ui/card_footer.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import { validateTaskCreate, type TaskCreateIntent } from '@/apps/shared/tasks/task_create_validation'
  import CreateTaskForm from '@/apps/user/modules/tasks/components/modals/create_task_form.svelte'
  import TaskDeleteDialog from '@/apps/user/modules/tasks/components/detail/task_delete_dialog.svelte'
  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'
  import type { TaskCreateFormData } from '@/apps/user/modules/tasks/types/create_form_types'

  interface Props {
    task: TaskDetail
    metadata: {
      statuses: { value: string; label: string }[]; labels: { value: string; label: string }[]
      priorities: { value: string; label: string }[]; users: { id: string; username: string; email: string }[]
      parentTasks?: { id: string; title: string; task_status_id: string | null }[]
      availableSkills?: { id: string; name: string; categoryCode?: string | null; rubricVersionId?: string | null }[]
      proficiencyLevels?: { value: string; label: string }[]
    }
    permissions?: { canDelete?: boolean }
  }
  const { task, metadata, permissions = {} }: Props = $props()
  const { t } = useTranslation()
  let errors = $state<Record<string, string>>({})
  let formError = $state('')
  let submitting = $state(false)
  let deleteDialogOpen = $state(false)
  let deleting = $state(false)
  const canDeleteDraft = $derived(
    Boolean(permissions.canDelete && task.resolved_brief?.state === 'draft')
  )
  const isDraftTask = $derived(task.resolved_brief?.state === 'draft')
  const existingEvidenceContract = $derived(
    task.resolved_brief?.resolvedContract?.evidence ?? null
  )

  function lines(value: unknown): string {
    if (!Array.isArray(value)) return ''
    return value.map((item) => typeof item === 'string' ? item : typeof item === 'object' && item ? String((item as Record<string, unknown>).title ?? '') : '').filter(Boolean).join('\n')
  }
  function contractLines(section: 'scope' | 'outOfScope' | 'deliverables' | 'qualityRequirements' | 'constraints' | 'dependencies'): string {
    return lines(task.resolved_brief?.resolvedContract?.work?.[section])
  }
  const initialForm = (): TaskCreateFormData => ({
    title: task.title, description: task.description ?? '', task_status_id: task.task_status_id ?? task.status,
    task_type: task.task_type ?? 'feature_development', verification_method: task.verification_method ?? '', project_id: task.project_id,
    priority: task.priority ?? '', label: task.label ?? '', task_visibility: task.task_visibility ?? 'internal', assigned_to: task.assigned_to ?? '',
    reviewer_user_id: '', due_date: task.due_date?.slice(0, 10) ?? '', parent_task_id: task.parent_task_id ?? '', estimated_time: String(task.estimated_time ?? 0),
    required_skills: (task.required_skills_rel ?? []).map((skill) => ({ id: skill.skill_id ?? skill.id, name: skill.skill?.skill_name ?? '', level: skill.required_public_proficiency_code ?? skill.level ?? '' })),
    acceptance_criteria: task.acceptance_criteria ?? '', context_background: task.context_background ?? '', role_in_task: task.role_in_task ?? '',
    business_domain: task.business_domain ?? '', problem_category: task.problem_category ?? '', tech_stack_text: (task.tech_stack ?? []).join(', '),
    learning_objectives_text: (task.learning_objectives ?? []).join(', '), domain_tags_text: (task.domain_tags ?? []).join(', '),
    scope_text: contractLines('scope'), out_of_scope_text: contractLines('outOfScope'), deliverables_text: contractLines('deliverables'),
    quality_requirements_text: contractLines('qualityRequirements'), constraints_text: contractLines('constraints'), dependencies_text: contractLines('dependencies'),
    authoring_mode: existingEvidenceContract?.mode === 'evidence_enabled' ? 'evidence_enabled' : 'operational_only', authoring_intent: isDraftTask ? 'save_draft' : 'publish', creator_confirmed: !isDraftTask, constraints_addressed: false, dependencies_addressed: false,
    supporting_reference_uri: '', supporting_reference_title: '', reviewer_role_code: 'org_owner', profile_eligibility: existingEvidenceContract?.profileEligibility ?? false,
  })
  let formData = $state<TaskCreateFormData>(initialForm())
  const setFormData = (updater: (previous: TaskCreateFormData) => TaskCreateFormData) => { formData = updater(formData) }
  const split = (value: string | undefined) => (value ?? '').split(/\n|,/).map((item) => item.trim()).filter(Boolean)
  const items = (value: string | undefined) => split(value).map((title) => ({ id: crypto.randomUUID(), title, description: title }))

  function submit(intent: TaskCreateIntent) {
    formData = { ...formData, authoring_intent: intent }
    const validationErrors = validateTaskCreate(formData, intent, t)
    if (Object.keys(validationErrors).length > 0) { errors = validationErrors; return }
    submitting = true; errors = {}; formError = ''
    const authoringMode = formData.authoring_mode ?? 'operational_only'
    const preservedEvidence = authoringMode === 'evidence_enabled' ? existingEvidenceContract : null
    const authoring = {
       mode: authoringMode, intent, idempotencyKey: `task-authoring-update:${crypto.randomUUID()}`,
      expectedHeadRevision: task.resolved_brief?.headRevision ?? 0, creatorConfirmed: formData.creator_confirmed ?? false,
      constraintsAddressed: formData.constraints_addressed ?? false, dependenciesAddressed: formData.dependencies_addressed ?? false,
      specification: { plainText: [formData.title, formData.description, formData.context_background, formData.acceptance_criteria].filter(Boolean).join('\n\n') },
      workContract: { action: formData.task_type, object: formData.title, problemStatement: formData.context_background, desiredOutcome: formData.acceptance_criteria,
        roleInTask: formData.role_in_task, ownershipLevel: 'contributor', autonomyLevel: 'supervised', collaborationType: 'team', environment: 'application', complexityContext: {}, impactScope: {}, estimatedUsersAffected: 1,
        dueAt: formData.due_date ? `${formData.due_date}T00:00:00.000Z` : null, scope: items(formData.scope_text), outOfScope: items(formData.out_of_scope_text), deliverables: items(formData.deliverables_text),
        acceptanceCriteria: split(formData.acceptance_criteria).map((statement) => ({ id: crypto.randomUUID(), statement, verificationMethod: formData.verification_method, critical: true })), qualityRequirements: items(formData.quality_requirements_text), constraints: items(formData.constraints_text), dependencies: items(formData.dependencies_text).map((item) => ({ ...item, ownerId: null, state: 'available' })) },
       evidenceContract: {
         mode: authoringMode,
         requirements: preservedEvidence?.requirements ?? [],
         verificationMethods: formData.verification_method
           ? [formData.verification_method]
           : (preservedEvidence?.verificationMethods ?? []),
         verifierPolicy: {
           reviewerIds: formData.reviewer_user_id
             ? [formData.reviewer_user_id]
             : (preservedEvidence?.verifierPolicy?.reviewerIds ?? []),
           reviewerRoleCodes: preservedEvidence?.verifierPolicy?.reviewerRoleCodes ?? [],
           minimumReviewers: authoringMode === 'evidence_enabled'
             ? Math.max(1, preservedEvidence?.verifierPolicy?.minimumReviewers ?? 1)
             : 0,
           disallowSelfReview: preservedEvidence?.verifierPolicy?.disallowSelfReview ?? true,
         },
         capabilities: preservedEvidence?.capabilities ?? [],
         profileEligibility: authoringMode === 'evidence_enabled' && (formData.profile_eligibility ?? false),
         privacyClassification: preservedEvidence?.privacyClassification ?? 'internal',
       },
    }
    router.put(`/tasks/${task.id}`, { title: formData.title, description: formData.description, priority: formData.priority || null, label: formData.label || null, project_id: formData.project_id, assigned_to: formData.assigned_to || null, task_visibility: formData.task_visibility, due_date: formData.due_date || null, parent_task_id: formData.parent_task_id || null, estimated_time: Number(formData.estimated_time || 0), task_type: formData.task_type, verification_method: formData.verification_method, acceptance_criteria: formData.acceptance_criteria, context_background: formData.context_background, tech_stack: split(formData.tech_stack_text), expected_deliverables: items(formData.deliverables_text), role_in_task: formData.role_in_task || undefined, problem_category: formData.problem_category || undefined, authoring }, { preserveScroll: true, onError: (value) => { errors = value; formError = t('task.edit.save_failed', {}, 'Could not save task changes'); submitting = false }, onSuccess: () => { submitting = false } })
  }
  function deleteDraft() {
    if (!canDeleteDraft || deleting) return
    deleting = true
    router.delete(`/tasks/${task.id}`, {
      preserveScroll: true,
      onSuccess: () => { deleteDialogOpen = false; deleting = false },
      onError: () => { deleting = false },
    })
  }
</script>

<svelte:head><title>{t('task.edit_task', {}, 'Edit Task')}</title></svelte:head>
<AppLayout title={t('task.edit_task', {}, 'Edit Task')}>
  <div class="mx-auto max-w-5xl p-4 sm:p-6">
    <Card><CardHeader><CardTitle>{t('task.edit_task', {}, 'Edit Task')}</CardTitle><p class="text-sm text-muted-foreground">{t('task.edit.contract_help', {}, 'Sửa hợp đồng công việc bằng cùng biểu mẫu lúc tạo task. Trạng thái và thời gian thực tế được quản lý ở luồng riêng.')}</p></CardHeader>
      <CardContent><CreateTaskForm {formData} {setFormData} {errors} {formError} statuses={metadata.statuses} priorities={metadata.priorities} labels={metadata.labels} users={metadata.users} parentTasks={metadata.parentTasks ?? []} availableSkills={metadata.availableSkills ?? []} proficiencyLevels={metadata.proficiencyLevels ?? []} /></CardContent>
      <CardFooter class="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        {#if canDeleteDraft}
          <Button variant="outline" class="border-destructive/40 text-destructive hover:bg-destructive/10" onclick={() => { deleteDialogOpen = true }} disabled={submitting || deleting}>{t('task.discard_draft', {}, 'Xóa nháp')}</Button>
        {:else}<span></span>{/if}
        <div class="flex gap-3"><Button variant="outline" onclick={() => router.visit(`/tasks/${task.id}`)} disabled={submitting || deleting}>{t('common.cancel', {}, 'Cancel')}</Button>{#if isDraftTask}<Button variant="outline" onclick={() => submit('save_draft')} disabled={submitting || deleting}>{submitting ? t('common.saving', {}, 'Saving...') : t('task.create.save_draft', {}, 'Lưu nháp')}</Button><Button onclick={() => submit('publish')} disabled={submitting || deleting}>{t('task.create.publish_assign', {}, 'Đăng và giao task')}</Button>{:else}<Button onclick={() => submit('publish')} disabled={submitting || deleting}>{submitting ? t('common.saving', {}, 'Saving...') : t('common.save_changes', {}, 'Save changes')}</Button>{/if}</div>
      </CardFooter>
    </Card>
  </div>
  <TaskDeleteDialog open={deleteDialogOpen} {deleting} taskTitle={task.title} draftOnly onConfirmDelete={deleteDraft} onOpenChange={(open: boolean) => { deleteDialogOpen = open }} />
</AppLayout>
