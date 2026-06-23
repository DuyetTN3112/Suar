<script lang="ts">
  import AlertDialog from '../../../inertia/components/ui/alert_dialog.svelte'
  import AlertDialogDescription from '../../../inertia/components/ui/alert_dialog_description.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'AlertDialogDescription', class: cls, value = 'opt1' }: Props = $props()
</script>
<AlertDialog><AlertDialogDescription class={cls}>{text}</AlertDialogDescription></AlertDialog>