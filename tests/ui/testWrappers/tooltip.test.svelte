<script lang="ts">
  import Tooltip from '../../../inertia/components/ui/tooltip.svelte'
  import TooltipContent from '../../../inertia/components/ui/tooltip_content.svelte'
  import TooltipTrigger from '../../../inertia/components/ui/tooltip_trigger.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'Tooltip', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <Tooltip>
    <TooltipTrigger>
      <span>{value}</span>
    </TooltipTrigger>
    <TooltipContent>{text}</TooltipContent>
  </Tooltip>
</div>
