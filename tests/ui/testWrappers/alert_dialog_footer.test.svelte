<script lang="ts">
  import AlertDialog from '../../../inertia/components/ui/alert_dialog.svelte'
  import AlertDialogFooter from '../../../inertia/components/ui/alert_dialog_footer.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'AlertDialogFooter', class: cls, value = 'opt1' }: Props = $props()
</script>
<AlertDialog><AlertDialogFooter class={cls}>{text}</AlertDialogFooter></AlertDialog>