<script lang="ts" module>
  export { default as ScrollArea, default as Root } from './scroll_area.svelte'
  export { default as ScrollBar } from './scroll_bar.svelte'
</script>

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { ScrollArea as ScrollAreaPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'
  import ScrollBar from './scroll_bar.svelte'

  type Props = ComponentProps<typeof ScrollAreaPrimitive.Root> & {
    class?: string
    children?: Snippet
    orientation?: 'vertical' | 'horizontal'
  }

  const {
    class: className,
    children,
    orientation = 'vertical',
    ...restProps
  }: Props = $props()
</script>

<ScrollAreaPrimitive.Root
  data-slot="scroll-area"
  class={cn('relative', className)}
  {...restProps}
>
  <ScrollAreaPrimitive.Viewport
    data-slot="scroll-area-viewport"
    class={cn(
      'focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1',
      orientation === 'horizontal' && 'overflow-x-auto!'
    )}
  >
    {@render children?.()}
  </ScrollAreaPrimitive.Viewport>
  <ScrollBar {orientation} />
  <ScrollAreaPrimitive.Corner />
</ScrollAreaPrimitive.Root>
