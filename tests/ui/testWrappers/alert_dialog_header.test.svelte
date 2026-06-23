<script lang="ts">
  import AlertDialog from '../../../inertia/components/ui/alert_dialog.svelte'
  import AlertDialogHeader from '../../../inertia/components/ui/alert_dialog_header.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'AlertDialogHeader', class: cls, value = 'opt1' }: Props = $props()
</script>
<AlertDialog><AlertDialogHeader class={cls}>{text}</AlertDialogHeader></AlertDialog>