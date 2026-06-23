<script lang="ts">
  import Tooltip from '../../../inertia/components/ui/tooltip.svelte'
  import TooltipTrigger from '../../../inertia/components/ui/tooltip_trigger.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'TooltipTrigger', class: cls, value = 'opt1' }: Props = $props()
</script>
<Tooltip><TooltipTrigger class={cls}>{text}</TooltipTrigger></Tooltip>