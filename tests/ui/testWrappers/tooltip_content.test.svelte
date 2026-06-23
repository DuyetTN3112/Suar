<script lang="ts">
  import Tooltip from '../../../inertia/components/ui/tooltip.svelte'
  import TooltipContent from '../../../inertia/components/ui/tooltip_content.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'TooltipContent', class: cls, value = 'opt1' }: Props = $props()
</script>
<Tooltip open={true}><TooltipContent class={cls}>{text}</TooltipContent></Tooltip>