<script lang="ts">
  import AlertDialog from '../../../inertia/components/ui/alert_dialog.svelte'
  import AlertDialogTrigger from '../../../inertia/components/ui/alert_dialog_trigger.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'AlertDialogTrigger', class: cls, value = 'opt1' }: Props = $props()
</script>
<AlertDialog><AlertDialogTrigger class={cls}>{text}</AlertDialogTrigger></AlertDialog>