<script lang="ts">
  import Popover from '../../../inertia/components/ui/popover.svelte'
  import PopoverTrigger from '../../../inertia/components/ui/popover_trigger.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'PopoverTrigger', class: cls, value = 'opt1' }: Props = $props()
</script>
<Popover><PopoverTrigger class={cls}>{text}</PopoverTrigger></Popover>