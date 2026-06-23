<script lang="ts">
  import Dialog from '../../../inertia/components/ui/dialog.svelte'
  import DialogDescription from '../../../inertia/components/ui/dialog_description.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DialogDescription', class: cls, value = 'opt1' }: Props = $props()
</script>
<Dialog><DialogDescription class={cls}>{text}</DialogDescription></Dialog>