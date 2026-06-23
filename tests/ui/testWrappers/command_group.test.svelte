<script lang="ts">
  import Command from '../../../inertia/components/ui/command.svelte'
  import CommandGroup from '../../../inertia/components/ui/command_group.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'CommandGroup', class: cls, value = 'opt1' }: Props = $props()
</script>
<Command><CommandGroup class={cls}>{text}</CommandGroup></Command>