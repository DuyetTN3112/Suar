<script lang="ts">
  import Command from '../../../inertia/components/ui/command.svelte'
  import CommandEmpty from '../../../inertia/components/ui/command_empty.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'CommandEmpty', class: cls, value = 'opt1' }: Props = $props()
</script>
<Command><CommandEmpty class={cls}>{text}</CommandEmpty></Command>