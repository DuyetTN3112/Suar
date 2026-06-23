<script lang="ts">
  import Command from '../../../inertia/components/ui/command.svelte'
  import CommandItem from '../../../inertia/components/ui/command_item.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'CommandItem', class: cls, value = 'opt1' }: Props = $props()
</script>
<Command><CommandItem class={cls}>{text}</CommandItem></Command>