<script lang="ts">
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/user/shared/ui/dialog_description.svelte'
  import DialogFooter from '@/apps/user/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/user/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/user/shared/ui/dialog_title.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import CreateTaskForm from '@/apps/user/modules/tasks/components/modals/create_task_form.svelte'
  import TaskCreateRoleBanner from '@/apps/user/modules/tasks/components/modals/task_create_role_banner.svelte'
  import { useCreateTaskStore, type CreateTaskStoreProps } from './create_task_store.svelte'

  interface Props extends Omit<CreateTaskStoreProps, 'open' | 'onOpenChange'> {
    open: boolean
    onOpenChange: (open: boolean) => void
    parentTasks?: { id: string; title: string; task_status_id: string | null }[]
    availableSkills?: { id: string; name: string; categoryCode?: string | null }[]
    proficiencyLevels?: { value: string; label: string }[]
    priorities?: { value: string; label: string }[]
    labels?: { value: string; label: string }[]
  }

  const props: Props = $props()
  const { t } = useTranslation()
  // svelte-ignore state_referenced_locally
  const store = useCreateTaskStore(props)
</script>

<Dialog open={props.open} onOpenChange={props.onOpenChange}>
  <DialogContent class="w-[96vw] sm:max-w-6xl max-h-[92vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>{t('task.new_task', {}, 'New task')}</DialogTitle>
      <DialogDescription>
        {t('task.new_task_description', {}, 'Fill in the details to create a new task.')}
      </DialogDescription>
    </DialogHeader>

    {#if store.formError}
      <div class="mb-4 rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        {store.formError}
      </div>
    {/if}

    {#if store.availableRoles.length > 0}
      <div class="mb-6">
        <TaskCreateRoleBanner
          projectId={store.formData.project_id}
          availableRoles={store.availableRoles}
          selectedRoleId={store.selectedRoleId}
          onRoleChange={store.handleRoleChange}
          prefilling={store.prefilling}
          prefilledSkillCount={store.prefilledSkillCount}
          roleMatchedProjectMembers={store.roleMatchedProjectMembers}
          onAssignMember={store.handleAssignRoleMatchedMember}
          assignedTo={store.formData.assigned_to}
        />
      </div>
    {/if}

    <CreateTaskForm
      formData={store.formData}
      setFormData={store.setFormData}
      errors={store.errors}
      statuses={props.statuses ?? []}
      priorities={props.priorities ?? []}
      labels={props.labels ?? []}
      projects={props.projects}
      users={store.scopedAssigneeUsers}
      assigneeGroups={store.assigneeGroups}
      parentTasks={props.parentTasks ?? []}
      availableSkills={props.availableSkills}
      proficiencyLevels={props.proficiencyLevels}
      selectedProjectVisibility={store.selectedProjectVisibility}
    />

    <DialogFooter class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
      <Button variant="outline" onclick={store.handleClose} disabled={store.submitting}>
        {t('common.cancel', {}, 'Cancel')}
      </Button>
      <Button onclick={store.handleSubmit} disabled={store.submitting}>
        {store.submitting
          ? t('common.creating', {}, 'Creating...')
          : t('common.create', {}, 'Create')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
