<script lang="ts">
  import Command from '../../../inertia/components/ui/command.svelte'
  import CommandShortcut from '../../../inertia/components/ui/command_shortcut.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'CommandShortcut', class: cls, value = 'opt1' }: Props = $props()
</script>
<Command><CommandShortcut class={cls}>{text}</CommandShortcut></Command>