<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Popover as PopoverPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof PopoverPrimitive.Content> & {
    class?: string
    children?: Snippet
  }

  const {
    class: className,
    align = 'center',
    sideOffset = 4,
    children,
    ...restProps
  }: Props = $props()
</script>

<PopoverPrimitive.Portal>
  <PopoverPrimitive.Content
    {align}
    {sideOffset}
    class={cn(
      'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
  </PopoverPrimitive.Content>
</PopoverPrimitive.Portal>
