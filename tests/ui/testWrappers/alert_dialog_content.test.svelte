<script lang="ts">
  import AlertDialog from '../../../inertia/components/ui/alert_dialog.svelte'
  import AlertDialogContent from '../../../inertia/components/ui/alert_dialog_content.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'AlertDialogContent', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <AlertDialog><AlertDialogContent>{text}</AlertDialogContent></AlertDialog>
</div>