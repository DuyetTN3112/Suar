<script lang="ts">
  import AlertDialog from '../../../inertia/components/ui/alert_dialog.svelte'
  import AlertDialogTitle from '../../../inertia/components/ui/alert_dialog_title.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'AlertDialogTitle', class: cls, value = 'opt1' }: Props = $props()
</script>
<AlertDialog><AlertDialogTitle class={cls}>{text}</AlertDialogTitle></AlertDialog>