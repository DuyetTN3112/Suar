<script lang="ts">
  import AlertDialog from '../../../inertia/components/ui/alert_dialog.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'AlertDialog', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <AlertDialog>{text}</AlertDialog>
</div>