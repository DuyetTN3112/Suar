<script lang="ts">
  import Dialog from '../../../inertia/components/ui/dialog.svelte'
  import DialogHeader from '../../../inertia/components/ui/dialog_header.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DialogHeader', class: cls, value = 'opt1' }: Props = $props()
</script>
<Dialog><DialogHeader class={cls}>{text}</DialogHeader></Dialog>