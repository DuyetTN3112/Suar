<script lang="ts">
  import CommandDialog from '../../../inertia/components/ui/command_dialog.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'CommandDialog', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <CommandDialog>{text}</CommandDialog>
</div>