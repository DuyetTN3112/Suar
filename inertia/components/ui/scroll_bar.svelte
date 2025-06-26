<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { ScrollArea as ScrollAreaPrimitive, type ScrollAreaScrollbarProps } from 'bits-ui'

  type Props = ScrollAreaScrollbarProps

  const props: Props = $props()
  const className = $derived(props.class)
  const orientation = $derived(props.orientation)
  const restProps = $derived.by(() => {
    const { class: _className, orientation: _orientation, ...rest } = props
    return rest
  })
</script>

<ScrollAreaPrimitive.Scrollbar
  data-slot="scroll-area-scrollbar"
  {orientation}
  class={cn(
    'flex touch-none p-px transition-colors select-none',
    orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
    orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
    className
  )}
  {...restProps}
>
  <ScrollAreaPrimitive.Thumb
    data-slot="scroll-area-thumb"
    class="bg-border relative flex-1 rounded-full"
  />
</ScrollAreaPrimitive.Scrollbar>
