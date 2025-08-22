<script lang="ts">
  import { Popover as PopoverPrimitive, type PopoverContentProps } from 'bits-ui'

  import { cn } from '$lib/utils-svelte'

  type Props = PopoverContentProps

  const props: Props = $props()
  const className = $derived(props.class)
  const align = $derived(props.align ?? 'center')
  const sideOffset = $derived(props.sideOffset ?? 4)
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const {
      class: _className,
      align: _align,
      sideOffset: _sideOffset,
      children: _children,
      ...rest
    } = props
    return rest
  })
</script>

<PopoverPrimitive.Portal>
  <PopoverPrimitive.Content
    {align}
    {sideOffset}
    class={cn(
      'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border-2 border-border p-4 shadow-neo outline-hidden',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
  </PopoverPrimitive.Content>
</PopoverPrimitive.Portal>
