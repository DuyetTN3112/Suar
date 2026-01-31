<script lang="ts">
  import { Tooltip as TooltipPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof TooltipPrimitive.Trigger> & {
    children?: Snippet
  }

  const { children, ...restProps }: Props = $props()
</script>

<TooltipPrimitive.Trigger {...restProps}>
  {@render children?.()}
</TooltipPrimitive.Trigger>
