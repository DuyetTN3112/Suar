<script lang="ts">
  import Dialog from '../../../inertia/components/ui/dialog.svelte'
  import DialogContent from '../../../inertia/components/ui/dialog_content.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DialogContent', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <Dialog><DialogContent>{text}</DialogContent></Dialog>
</div>