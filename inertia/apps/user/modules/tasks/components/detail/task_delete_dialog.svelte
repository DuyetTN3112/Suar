<script lang="ts">
  import AlertDialogRoot from '@/apps/user/shared/ui/alert_dialog.svelte'
  import AlertDialogAction from '@/apps/user/shared/ui/alert_dialog_action.svelte'
  import AlertDialogCancel from '@/apps/user/shared/ui/alert_dialog_cancel.svelte'
  import AlertDialogContent from '@/apps/user/shared/ui/alert_dialog_content.svelte'
  import AlertDialogDescription from '@/apps/user/shared/ui/alert_dialog_description.svelte'
  import AlertDialogFooter from '@/apps/user/shared/ui/alert_dialog_footer.svelte'
  import AlertDialogHeader from '@/apps/user/shared/ui/alert_dialog_header.svelte'
  import AlertDialogTitle from '@/apps/user/shared/ui/alert_dialog_title.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    open: boolean
    deleting: boolean
    taskTitle: string
    draftOnly?: boolean
    onConfirmDelete: () => void
    onOpenChange: (open: boolean) => void
  }

  const {
    open,
    deleting,
    taskTitle,
    draftOnly = false,
    onConfirmDelete,
    onOpenChange,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<AlertDialogRoot open={open} onOpenChange={onOpenChange}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {draftOnly
          ? t('task.confirm_discard_draft', {}, 'Xóa bản nháp')
          : t('task.confirm_delete', {}, 'Confirm task deletion')}
      </AlertDialogTitle>
      <AlertDialogDescription>
        {draftOnly
          ? t('task.confirm_discard_draft_description', {}, 'Bạn có chắc muốn xóa bản nháp')
          : t('task.confirm_delete_description', {}, 'Are you sure you want to delete task')} "{taskTitle}"?
        {t('task.action_irreversible', {}, 'This action cannot be undone.')}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{t('common.cancel', {}, 'Cancel')}</AlertDialogCancel>
      <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        <button onclick={onConfirmDelete} disabled={deleting} class="w-full h-full">
          {deleting
            ? t('common.deleting', {}, 'Deleting...')
            : draftOnly
              ? t('task.discard_draft', {}, 'Xóa nháp')
              : t('common.delete', {}, 'Delete')}
        </button>
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialogRoot>
