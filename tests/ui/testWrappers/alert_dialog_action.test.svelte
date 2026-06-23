<script lang="ts">
  import AlertDialog from '../../../inertia/components/ui/alert_dialog.svelte'
  import AlertDialogAction from '../../../inertia/components/ui/alert_dialog_action.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'AlertDialogAction', class: cls, value = 'opt1' }: Props = $props()
</script>
<AlertDialog><AlertDialogAction class={cls}>{text}</AlertDialogAction></AlertDialog>