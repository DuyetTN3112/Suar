<script lang="ts">
  import Command from '../../../inertia/components/ui/command.svelte'
  import CommandList from '../../../inertia/components/ui/command_list.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'CommandList', class: cls, value = 'opt1' }: Props = $props()
</script>
<Command><CommandList class={cls}>{text}</CommandList></Command>