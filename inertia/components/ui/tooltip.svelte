<script lang="ts" module>
  import { Tooltip as TooltipPrimitive } from 'bits-ui'

  export {
    default as Tooltip,
    default as Root
  } from './tooltip.svelte'
  export { default as TooltipTrigger, default as Trigger } from './tooltip_trigger.svelte'
  export { default as TooltipContent, default as Content } from './tooltip_content.svelte'
  export const TooltipProvider = TooltipPrimitive.Provider
</script>

<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof TooltipPrimitive.Root> & {
    children?: Snippet
  }

  const {
    children,
    ...restProps
  }: Props = $props()
</script>

<TooltipPrimitive.Provider delayDuration={0}>
  <TooltipPrimitive.Root {...restProps}>
    {@render children?.()}
  </TooltipPrimitive.Root>
</TooltipPrimitive.Provider>
