<script lang="ts" module>
  import { Tooltip as TooltipPrimitiveModule } from 'bits-ui'

  export {
    default as Tooltip,
    default as Root
  } from './tooltip.svelte'
  export { default as TooltipTrigger, default as Trigger } from './tooltip_trigger.svelte'
  export { default as TooltipContent, default as Content } from './tooltip_content.svelte'
  export const TooltipProvider = TooltipPrimitiveModule.Provider
</script>

<script lang="ts">
  import { Tooltip as TooltipPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  interface Props {
    children?: Snippet
    [key: string]: unknown
  }

  const { children, ...restProps }: Props = $props()
</script>

<TooltipPrimitive.Provider delayDuration={0}>
  <TooltipPrimitive.Root {...restProps}>
    {@render children?.()}
  </TooltipPrimitive.Root>
</TooltipPrimitive.Provider>
