<script lang="ts" module>
  export { default as ScrollArea, default as Root } from './scroll_area.svelte'
  export { default as ScrollBar } from './scroll_bar.svelte'
</script>

<script lang="ts">
  import { ScrollArea as ScrollAreaPrimitive, type ScrollAreaRootProps } from 'bits-ui'

  import { cn } from '$lib/utils-svelte'

  import ScrollBar from './scroll_bar.svelte'

  type Props = ScrollAreaRootProps & {
    orientation?: 'vertical' | 'horizontal'
  }

  const props: Props = $props()
  const className = $derived(props.class)
  const children = $derived(props.children)
  const orientation = $derived(props.orientation ?? 'vertical')
  const restProps = $derived.by(() => {
    const {
      class: _className,
      children: _children,
      orientation: _orientation,
      ...rest
    } = props
    return rest
  })
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
