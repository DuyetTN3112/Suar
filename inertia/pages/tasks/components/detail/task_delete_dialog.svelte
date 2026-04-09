<script lang="ts">
  import AlertDialogRoot from '@/components/ui/alert_dialog.svelte'
  import AlertDialogContent from '@/components/ui/alert_dialog_content.svelte'
  import AlertDialogHeader from '@/components/ui/alert_dialog_header.svelte'
  import AlertDialogTitle from '@/components/ui/alert_dialog_title.svelte'
  import AlertDialogDescription from '@/components/ui/alert_dialog_description.svelte'
  import AlertDialogFooter from '@/components/ui/alert_dialog_footer.svelte'
  import AlertDialogCancel from '@/components/ui/alert_dialog_cancel.svelte'
  import AlertDialogAction from '@/components/ui/alert_dialog_action.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    open: boolean
    deleting: boolean
    taskTitle: string
    onConfirmDelete: () => void
    onOpenChange: (open: boolean) => void
  }

  const {
    open,
    deleting,
    taskTitle,
    onConfirmDelete,
    onOpenChange,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<AlertDialogRoot open={open} onOpenChange={onOpenChange}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {t('task.confirm_delete', {}, 'Xac nhan xoa nhiem vu')}
      </AlertDialogTitle>
      <AlertDialogDescription>
        {t('task.confirm_delete_description', {}, 'Ban co chac chan muon xoa nhiem vu')} "{taskTitle}"?
        {t('task.action_irreversible', {}, 'Hanh dong nay khong the hoan tac.')}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{t('common.cancel', {}, 'Huy')}</AlertDialogCancel>
      <AlertDialogAction class="bg-red-500 hover:bg-red-600">
        <button onclick={onConfirmDelete} disabled={deleting} class="w-full h-full">
          {deleting ? t('common.deleting', {}, 'Dang xoa...') : t('common.delete', {}, 'Xoa')}
        </button>
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialogRoot>
