<script lang="ts">
  import Dialog from '../../../inertia/components/ui/dialog.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'Dialog', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <Dialog>{text}</Dialog>
</div>