<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Trash2 } from 'lucide-svelte'
  import { buttonVariants } from '@/apps/org/shared/ui/button_variants'

  import AlertDialogRoot from '@/apps/org/shared/ui/alert_dialog.svelte'
  import AlertDialogAction from '@/apps/org/shared/ui/alert_dialog_action.svelte'
  import AlertDialogCancel from '@/apps/org/shared/ui/alert_dialog_cancel.svelte'
  import AlertDialogContent from '@/apps/org/shared/ui/alert_dialog_content.svelte'
  import AlertDialogDescription from '@/apps/org/shared/ui/alert_dialog_description.svelte'
  import AlertDialogFooter from '@/apps/org/shared/ui/alert_dialog_footer.svelte'
  import AlertDialogHeader from '@/apps/org/shared/ui/alert_dialog_header.svelte'
  import AlertDialogTitle from '@/apps/org/shared/ui/alert_dialog_title.svelte'
  import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte'

  interface Props {
    task: TaskDetail
    currentUser: {
      id?: string | number
      role?: string
      organization_id?: string | number
    }
  }

  const { task, currentUser }: Props = $props()
  let deleteDialogOpen = $state(false)
  const { t } = useTranslation()

  // Check whether the current user can delete this task.
  const canDeleteTask = () => {
    if (!currentUser.id) {
      return false
    }

    const taskOrgId = task.organization_id
    const userOrgId = currentUser.organization_id

    if (taskOrgId && userOrgId && taskOrgId !== userOrgId) {
      return false
    }

    if (currentUser.role === 'admin') {
      return true
    }

    const creatorId = task.creator_id || (task.creator?.id)
    const isCreator = Boolean(creatorId && creatorId === currentUser.id)

    if (isCreator) {
      return true
    }

    return false
  }

  const openDeleteConfirm = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    deleteDialogOpen = true
  }

  const confirmDeleteTask = () => {
    router.delete(`/tasks/${task.id}`, {
      onSuccess: () => {
        deleteDialogOpen = false
      },
      onError: (errors: unknown) => {
        console.error('Error deleting task:', errors)
        notificationStore.error(
          t('task.delete_error_title', {}, 'Unable to delete task'),
          t('task.delete_error_description', {}, 'Please try again.')
        )
      },
      preserveScroll: true,
      preserveState: true,
      replace: true,
      only: ['tasks']
    })
  }

  const hasPermission = $derived(canDeleteTask())
</script>

{#if hasPermission}
  <button
    class="inline-flex items-center justify-center h-5 w-5 rounded-md hover:bg-accent hover:text-accent-foreground"
    onclick={openDeleteConfirm}
    title={t('task.delete_task', {}, 'Delete task')}
    aria-label={t('task.delete_task', {}, 'Delete task')}
  >
    <Trash2 class="h-3 w-3 text-destructive" />
  </button>

  <AlertDialogRoot bind:open={deleteDialogOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t('task.delete_confirm_title', {}, 'Delete task?')}</AlertDialogTitle>
        <AlertDialogDescription>
          {t('task.delete_confirm_description', { title: task.title }, 'Are you sure you want to delete task ":title"?')}
          {t('task.action_irreversible', {}, 'This action cannot be undone.')}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{t('common.cancel', {}, 'Cancel')}</AlertDialogCancel>
        <AlertDialogAction
          onclick={confirmDeleteTask}
          class={buttonVariants({ variant: 'destructive' })}
        >
          {t('common.delete', {}, 'Delete')}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialogRoot>
{/if}
