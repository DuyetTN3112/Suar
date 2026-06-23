<script lang="ts">
  import Dialog from '../../../inertia/components/ui/dialog.svelte'
  import DialogTrigger from '../../../inertia/components/ui/dialog_trigger.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DialogTrigger', class: cls, value = 'opt1' }: Props = $props()
</script>
<Dialog><DialogTrigger class={cls}>{text}</DialogTrigger></Dialog>