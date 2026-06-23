<script lang="ts">
  import Dialog from '../../../inertia/components/ui/dialog.svelte'
  import DialogFooter from '../../../inertia/components/ui/dialog_footer.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DialogFooter', class: cls, value = 'opt1' }: Props = $props()
</script>
<Dialog><DialogFooter class={cls}>{text}</DialogFooter></Dialog>