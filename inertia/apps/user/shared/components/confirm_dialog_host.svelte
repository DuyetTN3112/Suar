<script lang="ts">
  import ConfirmDialog from '@/apps/user/shared/components/confirm_dialog.svelte'
  import { confirmDialogStore } from '@/apps/user/shared/stores/confirm_dialog_store.svelte'
</script>

<ConfirmDialog
  open={$confirmDialogStore.open}
  onOpenChange={(open: boolean) => confirmDialogStore.setOpen(open)}
  title={$confirmDialogStore.title}
  desc={$confirmDialogStore.desc}
  confirmText={$confirmDialogStore.confirmText}
  cancelBtnText={$confirmDialogStore.cancelBtnText}
  destructive={$confirmDialogStore.destructive}
  handleConfirm={() => confirmDialogStore.confirm()}
/>
