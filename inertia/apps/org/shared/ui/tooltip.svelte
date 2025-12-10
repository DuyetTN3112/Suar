<script lang="ts">
  import { Tooltip as TooltipPrimitive, type TooltipRootProps } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = TooltipRootProps & {
    children?: Snippet
  }

  const { children, ...restProps }: Props = $props()
</script>

<TooltipPrimitive.Provider delayDuration={0}>
  <TooltipPrimitive.Root {...restProps}>
    {@render children?.()}
  </TooltipPrimitive.Root>
</TooltipPrimitive.Provider>
