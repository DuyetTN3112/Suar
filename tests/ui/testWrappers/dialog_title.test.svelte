<script lang="ts">
  import Dialog from '../../../inertia/components/ui/dialog.svelte'
  import DialogTitle from '../../../inertia/components/ui/dialog_title.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DialogTitle', class: cls, value = 'opt1' }: Props = $props()
</script>
<Dialog><DialogTitle class={cls}>{text}</DialogTitle></Dialog>