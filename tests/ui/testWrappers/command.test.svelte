<script lang="ts">
  import Command from '../../../inertia/components/ui/command.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'Command', class: cls, value = 'opt1' }: Props = $props()
</script>
<Command class={cls}>{text}</Command>