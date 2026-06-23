<script lang="ts">
  import Dialog from '../../../inertia/components/ui/dialog.svelte'
  import DialogClose from '../../../inertia/components/ui/dialog_close.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DialogClose', class: cls, value = 'opt1' }: Props = $props()
</script>
<Dialog><DialogClose class={cls}>{text}</DialogClose></Dialog>