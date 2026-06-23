<script lang="ts">
  import Command from '../../../inertia/components/ui/command.svelte'
  import CommandInput from '../../../inertia/components/ui/command_input.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'CommandInput', class: cls, value = 'opt1' }: Props = $props()
</script>
<Command><CommandInput class={cls}>{text}</CommandInput></Command>