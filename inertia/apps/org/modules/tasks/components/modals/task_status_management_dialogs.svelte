<script lang="ts">
  import { TriangleAlert } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/org/shared/ui/dialog_description.svelte'
  import DialogFooter from '@/apps/org/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import SelectValue from '@/apps/org/shared/ui/select_value.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import type { TaskStatusCategory } from '@/apps/org/modules/tasks/types/index.svelte'

  interface DeleteStatusTarget {
    status: string
    label: string
    taskCount: number
    id?: string
    isSystem?: boolean
  }

  interface RenameStatusTarget {
    status: string
    label: string
    id?: string
  }

  interface Props {
    createOpen: boolean
    createStatusName: string
    createStatusCategory: TaskStatusCategory | ''
    createStatusDescription: string
    createStatusColor: string
    createStatusError: string
    createStatusSubmitting: boolean
    onCreateSubmit: () => void
    onCreateClose: () => void
    onCreateOpenChange: (open: boolean) => void
    onCreateStatusNameChange: (value: string) => void
    onCreateStatusCategoryChange: (value: TaskStatusCategory | '') => void
    onCreateStatusDescriptionChange: (value: string) => void
    onCreateStatusColorChange: (value: string) => void

    renameOpen: boolean
    renameStatusName: string
    renameStatusError: string
    renameStatusSubmitting: boolean
    statusRenameTarget: RenameStatusTarget | null
    onRenameSubmit: () => void
    onRenameClose: () => void
    onRenameOpenChange: (open: boolean) => void
    onRenameStatusNameChange: (value: string) => void

    deleteOpen: boolean
    deleteStatusError: string
    deleteStatusSubmitting: boolean
    deleteStatusTarget: DeleteStatusTarget | null
    hasDeleteTargetTasks: boolean
    isStatusMutationLocked: boolean
    onDeleteConfirm: () => void
    onDeleteClose: () => void
    onDeleteOpenChange: (open: boolean) => void
  }

  let {
    createOpen = $bindable(),
    createStatusName = $bindable(),
    createStatusCategory = $bindable(),
    createStatusDescription = $bindable(),
    createStatusColor = $bindable(),
    createStatusError = $bindable(),
    createStatusSubmitting = $bindable(),
    onCreateSubmit,
    onCreateClose,
    onCreateOpenChange,
    onCreateStatusNameChange,
    onCreateStatusCategoryChange,
    onCreateStatusDescriptionChange,
    onCreateStatusColorChange,
    renameOpen = $bindable(),
    renameStatusName = $bindable(),
    renameStatusError = $bindable(),
    renameStatusSubmitting = $bindable(),
    statusRenameTarget = $bindable(),
    onRenameSubmit,
    onRenameClose,
    onRenameOpenChange,
    onRenameStatusNameChange,
    deleteOpen = $bindable(),
    deleteStatusError = $bindable(),
    deleteStatusSubmitting = $bindable(),
    deleteStatusTarget = $bindable(),
    hasDeleteTargetTasks = $bindable(),
    isStatusMutationLocked = $bindable(),
    onDeleteConfirm,
    onDeleteClose,
    onDeleteOpenChange,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<Dialog
  open={deleteOpen}
  onOpenChange={(open: boolean) => {
    onDeleteOpenChange(open)
    if (!open) {
      onDeleteClose()
    }
  }}
>
  <DialogContent class="sm:max-w-[480px]">
    <DialogHeader>
      <DialogTitle>{t('task.workflow.delete_dialog_title', {}, 'Delete status')}</DialogTitle>
      <DialogDescription>
        {t('task.workflow.delete_dialog_description', {}, 'This only deletes the status column and does not automatically delete tasks.')}
      </DialogDescription>
    </DialogHeader>

    {#if deleteStatusTarget}
      <div class="space-y-3 py-1 text-sm">
        <p>
          {t('task.workflow.delete_target_prefix', {}, 'You are about to delete status')} <span class="font-semibold">{deleteStatusTarget.label}</span>.
        </p>

        <div class="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-800 dark:text-amber-200">
          <div class="flex items-start gap-2">
            <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p class="font-medium">{t('task.workflow.warning_title', {}, 'Warning')}</p>
              <p>
                {t('task.workflow.delete_task_warning_prefix', {}, 'This column currently has')} <span class="font-semibold">{deleteStatusTarget.taskCount}</span> {t('task.workflow.tasks_suffix', {}, 'tasks')}.
                {t('task.workflow.delete_task_warning_suffix', {}, 'If tasks remain, deletion is blocked to prevent data loss.')}
              </p>
            </div>
          </div>
        </div>

        {#if deleteStatusError}
          <p class="text-destructive">{deleteStatusError}</p>
        {/if}

        {#if deleteStatusTarget.isSystem}
          <p class="text-sm text-muted-foreground">
            {t('task.workflow.delete_system_status_error', {}, 'System statuses cannot be deleted.')}
          </p>
        {:else if hasDeleteTargetTasks}
          <p class="text-sm text-muted-foreground">
            {t('task.workflow.delete_has_tasks_error', {}, 'This status still has tasks. Move tasks to another column before deleting it.')}
          </p>
        {:else if isStatusMutationLocked}
          <p class="text-sm text-muted-foreground">
            {t('task.workflow.current_operation_wait_message', {}, 'Please wait for the current operation to finish.')}
          </p>
        {/if}
      </div>
    {/if}

    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          onDeleteOpenChange(false)
          onDeleteClose()
        }}
        disabled={deleteStatusSubmitting}
      >
        {t('common.cancel', {}, 'Cancel')}
      </Button>
      <Button
        variant="destructive"
        onclick={onDeleteConfirm}
        disabled={deleteStatusSubmitting || !deleteStatusTarget?.id || deleteStatusTarget.isSystem === true || hasDeleteTargetTasks || isStatusMutationLocked}
      >
        {deleteStatusSubmitting ? t('task.workflow.deleting', {}, 'Deleting...') : t('task.workflow.delete_status_button', {}, 'Delete status')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog
  open={renameOpen}
  onOpenChange={(open: boolean) => {
    onRenameOpenChange(open)
    if (!open) {
      onRenameClose()
    }
  }}
>
  <DialogContent class="sm:max-w-[460px]">
    <DialogHeader>
      <DialogTitle>{t('task.workflow.rename_dialog_title', {}, 'Rename status')}</DialogTitle>
      <DialogDescription>
        {t('task.workflow.rename_dialog_description', {}, 'The new name applies to the task board column and task workflow page.')}
      </DialogDescription>
    </DialogHeader>

    <div class="space-y-4 py-2">
      <div class="space-y-2">
        <Label for="rename-status-name">{t('task.workflow.status_name_label', {}, 'Status name')}</Label>
        <Input
          id="rename-status-name"
          placeholder={t('task.workflow.status_name_placeholder', {}, 'Example: Ready for QA')}
          value={renameStatusName}
          disabled={renameStatusSubmitting || isStatusMutationLocked}
          oninput={(event: Event) => {
            const target = event.target as HTMLInputElement
            onRenameStatusNameChange(target.value)
          }}
          onkeydown={(event: KeyboardEvent) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onRenameSubmit()
            }
          }}
        />
      </div>

      {#if renameStatusError}
        <p class="text-sm text-destructive">{renameStatusError}</p>
      {/if}

      {#if !statusRenameTarget?.id}
        <p class="text-sm text-muted-foreground">{t('task.workflow.rename_dialog_missing_target', {}, 'Unable to find a status identifier to update.')}</p>
      {/if}
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          onRenameOpenChange(false)
          onRenameClose()
        }}
        disabled={renameStatusSubmitting}
      >
        {t('common.cancel', {}, 'Cancel')}
      </Button>
      <Button
        onclick={onRenameSubmit}
        disabled={renameStatusSubmitting || isStatusMutationLocked || !statusRenameTarget?.id}
      >
        {renameStatusSubmitting ? t('task.workflow.saving', {}, 'Saving...') : t('task.workflow.save_name_button', {}, 'Save name')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog
  open={createOpen}
  onOpenChange={(open: boolean) => {
    onCreateOpenChange(open)
    if (!open) {
      onCreateClose()
    }
  }}
>
  <DialogContent class="sm:max-w-[460px]">
    <DialogHeader>
      <DialogTitle>{t('task.workflow.create_dialog_title', {}, 'Add new status')}</DialogTitle>
      <DialogDescription>
        {t('task.workflow.create_dialog_description', {}, 'Enter a new status name to add a board column.')}
      </DialogDescription>
    </DialogHeader>

    <div class="space-y-4 py-2">
      <div class="space-y-2">
        <Label for="status-name">{t('task.workflow.status_name_label', {}, 'Status name')}</Label>
        <Input
          id="status-name"
          placeholder={t('task.workflow.status_name_placeholder', {}, 'Example: Ready for QA')}
          value={createStatusName}
          disabled={createStatusSubmitting || isStatusMutationLocked}
          oninput={(event: Event) => {
            const target = event.target as HTMLInputElement
            onCreateStatusNameChange(target.value)
          }}
          onkeydown={(event: KeyboardEvent) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onCreateSubmit()
            }
          }}
        />
      </div>

      <div class="space-y-2">
        <Label>{t('task.workflow.status_group_label', {}, 'Status group')}</Label>
        <Select
          value={createStatusCategory}
          onValueChange={(value: string) => {
            if (createStatusSubmitting || isStatusMutationLocked) return
            onCreateStatusCategoryChange(value as TaskStatusCategory)
          }}
        >
          <SelectTrigger class="w-full {createStatusSubmitting || isStatusMutationLocked ? 'pointer-events-none opacity-60' : ''}">
            <SelectValue placeholder={t('task.workflow.status_group_placeholder', {}, 'Choose status group')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo" label={t('task.workflow.group_todo_label', {}, 'Todo: Not started')} />
            <SelectItem value="in_progress" label={t('task.workflow.group_in_progress_label', {}, 'In progress: In progress')} />
            <SelectItem value="done" label={t('task.workflow.group_done_label', {}, 'Done: Completed')} />
            <SelectItem value="cancelled" label={t('task.workflow.group_cancelled_label', {}, 'Cancelled: Cancelled')} />
          </SelectContent>
        </Select>
      </div>

      <div class="grid gap-3 sm:grid-cols-[1fr_96px]">
        <div class="space-y-2">
          <Label for="status-description">{t('task.workflow.description_label', {}, 'Description')}</Label>
          <Input
          id="status-description"
          placeholder={t('task.workflow.description_placeholder', {}, 'Short description')}
          value={createStatusDescription}
          disabled={createStatusSubmitting || isStatusMutationLocked}
          oninput={(event: Event) => {
            const target = event.target as HTMLInputElement
            onCreateStatusDescriptionChange(target.value)
            }}
          />
        </div>
        <div class="space-y-2">
          <Label for="status-color">{t('task.workflow.color_label', {}, 'Color')}</Label>
          <Input
            id="status-color"
            type="color"
            class="h-9 p-1"
            value={createStatusColor}
            disabled={createStatusSubmitting || isStatusMutationLocked}
            oninput={(event: Event) => {
              const target = event.target as HTMLInputElement
              onCreateStatusColorChange(target.value)
            }}
          />
        </div>
      </div>

      {#if createStatusError}
        <p class="text-sm text-destructive">{createStatusError}</p>
      {/if}
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          onCreateOpenChange(false)
          onCreateClose()
        }}
        disabled={createStatusSubmitting}
      >
        {t('common.cancel', {}, 'Cancel')}
      </Button>
      {#if isStatusMutationLocked}
        <p class="text-xs text-muted-foreground">
          {t('task.workflow.current_operation_wait_message', {}, 'Please wait for the current operation to finish.')}
        </p>
      {/if}
      <Button onclick={onCreateSubmit} disabled={createStatusSubmitting || isStatusMutationLocked}>
        {createStatusSubmitting ? t('task.workflow.creating', {}, 'Creating...') : t('task.workflow.create_status_button', {}, 'Create status')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
