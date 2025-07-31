<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Tooltip as TooltipPrimitive, type TooltipContentProps } from 'bits-ui'

  type Props = TooltipContentProps

  const props: Props = $props()
  const className = $derived(props.class)
  const sideOffset = $derived(props.sideOffset ?? 0)
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const {
      class: _className,
      sideOffset: _sideOffset,
      children: _children,
      ...rest
    } = props
    return rest
  })
</script>

<TooltipPrimitive.Portal>
  <TooltipPrimitive.Content
    {sideOffset}
    class={cn(
      'bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md border-2 border-border shadow-neo-sm px-3 py-1.5 text-xs font-bold text-balance',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
  </TooltipPrimitive.Content>
</TooltipPrimitive.Portal>
