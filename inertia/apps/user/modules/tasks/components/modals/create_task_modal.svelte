<script lang="ts">
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import DialogFooter from '@/apps/user/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/user/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/user/shared/ui/dialog_title.svelte'
  import AlertDialogRoot from '@/apps/user/shared/ui/alert_dialog.svelte'
  import AlertDialogAction from '@/apps/user/shared/ui/alert_dialog_action.svelte'
  import AlertDialogCancel from '@/apps/user/shared/ui/alert_dialog_cancel.svelte'
  import AlertDialogContent from '@/apps/user/shared/ui/alert_dialog_content.svelte'
  import AlertDialogDescription from '@/apps/user/shared/ui/alert_dialog_description.svelte'
  import AlertDialogFooter from '@/apps/user/shared/ui/alert_dialog_footer.svelte'
  import AlertDialogHeader from '@/apps/user/shared/ui/alert_dialog_header.svelte'
  import AlertDialogTitle from '@/apps/user/shared/ui/alert_dialog_title.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import CreateTaskForm from '@/apps/user/modules/tasks/components/modals/create_task_form.svelte'
  import TaskCreateRoleBanner from '@/apps/user/modules/tasks/components/modals/task_create_role_banner.svelte'
  import { useCreateTaskStore, type CreateTaskStoreProps } from './create_task_store.svelte'

  interface Props extends Omit<CreateTaskStoreProps, 'open' | 'onOpenChange'> {
    open: boolean
    onOpenChange: (open: boolean) => void
    parentTasks?: { id: string; title: string; task_status_id: string | null }[]
    availableSkills?: { id: string; name: string; categoryCode?: string | null }[]
    proficiencyLevels?: { id?: string; value: string; label: string }[]
    priorities?: { value: string; label: string }[]
    labels?: { value: string; label: string }[]
  }

  const props: Props = $props()
  const { t } = useTranslation()
  const store = useCreateTaskStore(() => props)
  type ProjectSkillApiRecord = {
    id: string
    skill: { id: string; skillName: string; categoryCode?: string | null }
    displayNameOverride?: string | null
    rubricVersionId?: string | null
    minimumTaskRequirementLevelId?: string | null
    maximumTaskRequirementLevelId?: string | null
    minimumTaskRequirementLevelCode?: string | null
    maximumTaskRequirementLevelCode?: string | null
    isActive?: boolean
    isSelectableForTasks?: boolean
  }
  type TaskSkillOption = NonNullable<Props['availableSkills']>[number] & {
    projectSkillId?: string | null
    rubricVersionId?: string | null
    minimumTaskRequirementLevelId?: string | null
    maximumTaskRequirementLevelId?: string | null
    minimumTaskRequirementLevelCode?: string | null
    maximumTaskRequirementLevelCode?: string | null
  }
  let liveProjectSkills = $state<TaskSkillOption[] | null>(null)
  let liveProjectSkillRequestKey = 0

  $effect(() => {
    const projectId = store.formData.project_id
    if (!props.open || !projectId) {
      liveProjectSkills = null
      return
    }

    const requestKey = ++liveProjectSkillRequestKey
    liveProjectSkills = null
    void fetch(`/api/v1/projects/${projectId}/skills`)
      .then((response) => {
        if (response.ok === false) throw new Error('Unable to load project skills')
        return response.json() as Promise<{ data?: ProjectSkillApiRecord[] }>
      })
      .then((payload) => {
        if (requestKey !== liveProjectSkillRequestKey) return
        const projectedSkills = (payload.data ?? [])
          .filter((skill) => skill.isActive !== false && skill.isSelectableForTasks !== false)
          .map((projectSkill) => ({
            id: projectSkill.skill.id,
            projectSkillId: projectSkill.id,
            name: projectSkill.displayNameOverride ?? projectSkill.skill.skillName,
            categoryCode: projectSkill.skill.categoryCode ?? null,
            rubricVersionId: projectSkill.rubricVersionId ?? null,
            minimumTaskRequirementLevelId: projectSkill.minimumTaskRequirementLevelId ?? null,
            maximumTaskRequirementLevelId: projectSkill.maximumTaskRequirementLevelId ?? null,
            minimumTaskRequirementLevelCode: projectSkill.minimumTaskRequirementLevelCode ?? null,
            maximumTaskRequirementLevelCode: projectSkill.maximumTaskRequirementLevelCode ?? null,
          }))
        liveProjectSkills = projectedSkills
        const projectSkillsBySkillId = new Map(
          projectedSkills.map((skill) => [skill.id, skill])
        )
        store.setFormData((previous) => {
          let changed = false
          const requiredSkills = previous.required_skills.map((skill) => {
            const projectSkill = projectSkillsBySkillId.get(skill.id)
            if (!projectSkill) return skill
            const ceilingId = projectSkill.maximumTaskRequirementLevelId ?? null
            const ceilingCode =
              projectSkill.maximumTaskRequirementLevelCode ??
              props.proficiencyLevels?.find((level) => level.id === ceilingId)?.value ??
              skill.assessment_ceiling_level_code ??
              null
            const nextSkill = {
              ...skill,
              project_skill_id: projectSkill.projectSkillId ?? skill.project_skill_id,
              rubric_version_id: projectSkill.rubricVersionId ?? skill.rubric_version_id ?? null,
              assessment_ceiling_level_id: ceilingId ?? skill.assessment_ceiling_level_id,
              assessment_ceiling_level_code: ceilingCode,
            }
            if (
              nextSkill.project_skill_id !== skill.project_skill_id ||
              nextSkill.rubric_version_id !== skill.rubric_version_id ||
              nextSkill.assessment_ceiling_level_id !== skill.assessment_ceiling_level_id ||
              nextSkill.assessment_ceiling_level_code !== skill.assessment_ceiling_level_code
            ) {
              changed = true
            }
            return nextSkill
          })
          return changed ? { ...previous, required_skills: requiredSkills } : previous
        })
      })
      .catch(() => {
        if (requestKey === liveProjectSkillRequestKey) {
          liveProjectSkills = props.availableSkills ?? []
        }
      })
  })

  const availableSkillsForForm = $derived(liveProjectSkills ?? props.availableSkills ?? [])
  const selectedBoardStatus = $derived(
    props.statuses?.find((status) => status.value === store.formData.task_status_id)?.label ??
      t('task.create.board_column', {}, 'Cột Board đã chọn')
  )
  let discardDraftOpen = $state(false)
  const hasUnsavedDraft = $derived(
    Boolean(
        store.formData.title.trim() ||
        store.formData.description.trim() ||
        store.formData.context_background.trim() ||
        store.formData.acceptance_criteria.trim() ||
        store.formData.brief.workItems.some((item) =>
          item.affectedArea.trim() || item.requiredChange.trim() || item.resultingBehaviour.trim()
        ) ||
        store.formData.brief.scope.some((item) => item.text.trim()) ||
        store.formData.brief.outOfScope.some((item) => item.text.trim()) ||
        store.formData.brief.businessRules.some((item) =>
          item.actor.trim() || item.condition.trim() || item.permission.trim() || item.systemResult.trim()
        ) ||
        store.formData.brief.constraints.some((item) => item.text.trim()) ||
        store.formData.brief.dependencies.some((item) => item.dependency.trim() || item.owner.trim()) ||
        store.formData.brief.deliverables.some((item) =>
          item.outputType.trim() || item.locationOrRecipient.trim() || item.minimumState.trim()
        ) ||
        store.formData.brief.acceptanceCriteria.some((item) =>
          item.condition.trim() || item.action.trim() || item.observableResult.trim()
        )
    )
  )

  const discardDraft = () => {
    discardDraftOpen = false
    store.discardDraft()
  }
</script>

{#snippet assignmentContent()}
  {#if !store.isDocumentationItem && store.formData.task_visibility === 'project' && store.availableRoles.length > 0}
    <TaskCreateRoleBanner
      projectId={store.formData.project_id}
      availableRoles={store.availableRoles}
      selectedRoleId={store.selectedRoleId}
      onRoleChange={store.handleRoleChange}
      roleMatchedProjectMembers={store.roleMatchedProjectMembers}
      onAssignMember={store.handleAssignRoleMatchedMember}
      assignedTo={store.formData.assigned_to}
    />
  {/if}
{/snippet}

<Dialog open={props.open} onOpenChange={props.onOpenChange}>
  <DialogContent class="flex h-[92vh] max-h-[92vh] w-[96vw] flex-col overflow-hidden p-0 sm:max-w-6xl">
    <div class="flex h-full min-h-0 flex-col">
      <DialogHeader class="shrink-0 border-b border-border bg-muted/10 px-6 py-4 sm:px-8">
        <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{t('task.create.task_workspace', {}, 'Task workspace')}</span>
          <span aria-hidden="true">/</span>
          <span>{t('task.create.board_context', {}, 'Board')}</span>
          <span class="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 font-semibold text-foreground">
            {selectedBoardStatus}
          </span>
        </div>
        <DialogTitle class="sr-only">{t('task.create.dialog_title', {}, 'Tạo Task')}</DialogTitle>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
        {#if store.formError}
          <div class="mb-4 rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {store.formError}
          </div>
        {/if}

        <CreateTaskForm
          formData={store.formData}
          setFormData={store.setFormData}
          errors={store.errors}
          statuses={props.statuses ?? []}
          priorities={props.priorities ?? []}
          labels={props.labels ?? []}
          users={store.scopedAssigneeUsers}
          assigneeGroups={store.assigneeGroups}
          parentTasks={props.parentTasks ?? []}
          availableSkills={availableSkillsForForm}
          proficiencyLevels={props.proficiencyLevels}
          selectedProjectVisibility={store.selectedProjectVisibility}
          {assignmentContent}
        />
      </div>

      <DialogFooter class="shrink-0 border-t border-border bg-background px-6 py-4 sm:flex-row sm:justify-between sm:px-8">
        <p class="hidden text-xs leading-5 text-muted-foreground lg:block">Lưu nháp để hoàn thiện sau; chỉ “Tạo và giao việc” mới kiểm tra đủ contract.</p>
        <div class="flex flex-wrap justify-end gap-2">
          {#if hasUnsavedDraft}
            <Button
              variant="destructive"
              onclick={() => (discardDraftOpen = true)}
              disabled={store.submitting}
            >
              {t('task.create.delete_draft', {}, 'Xóa nháp')}
            </Button>
          {/if}
          <Button variant="outline" onclick={store.handleClose} disabled={store.submitting}>
            {t('common.cancel', {}, 'Cancel')}
          </Button>
          {#if store.isDocumentationItem}
            <Button onclick={store.handleSubmit} disabled={store.submitting}>
              {store.submitting ? t('common.creating', {}, 'Đang tạo...') : t('task.create.create_docs', {}, 'Tạo mục Docs')}
            </Button>
          {:else}
            <Button variant="outline" onclick={store.saveDraft} disabled={store.submitting}>
              {t('task.create.save_draft', {}, 'Lưu nháp')}
            </Button>
            <Button onclick={store.handleSubmit} disabled={store.submitting}>
              {store.submitting ? t('common.creating', {}, 'Đang tạo...') : t('task.create.publish_assign', {}, 'Tạo và giao việc')}
            </Button>
          {/if}
        </div>
      </DialogFooter>
    </div>
  </DialogContent>
</Dialog>

<AlertDialogRoot bind:open={discardDraftOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t('task.create.delete_draft_title', {}, 'Xóa nháp này?')}</AlertDialogTitle>
      <AlertDialogDescription>
        {t(
          'task.create.delete_draft_description',
          {},
          'Toàn bộ thông tin bạn đã nhập trong cửa sổ này sẽ bị xóa và không thể khôi phục.'
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{t('common.cancel', {}, 'Hủy')}</AlertDialogCancel>
      <AlertDialogAction onclick={discardDraft} class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        {t('task.create.delete_draft', {}, 'Xóa nháp')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialogRoot>
