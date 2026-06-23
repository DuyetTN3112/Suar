<script lang="ts">
  import Command from '../../../inertia/components/ui/command.svelte'
  import CommandSeparator from '../../../inertia/components/ui/command_separator.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'CommandSeparator', class: cls, value = 'opt1' }: Props = $props()
</script>
<Command><CommandSeparator class={cls}>{text}</CommandSeparator></Command>