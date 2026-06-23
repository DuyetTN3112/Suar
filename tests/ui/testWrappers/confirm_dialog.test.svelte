<script lang="ts">
  import ConfirmDialog from '../../../inertia/components/confirm_dialog.svelte'
  interface Props { class?: string; text?: string }
  let { class: cls, text = 'Test' }: Props = $props()
</script>
<div class={cls}>
  <ConfirmDialog>{text}</ConfirmDialog>
</div>