<script lang="ts">
  import AlertDialog from '../../../inertia/components/ui/alert_dialog.svelte'
  import AlertDialogCancel from '../../../inertia/components/ui/alert_dialog_cancel.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'AlertDialogCancel', class: cls, value = 'opt1' }: Props = $props()
</script>
<AlertDialog><AlertDialogCancel class={cls}>{text}</AlertDialogCancel></AlertDialog>