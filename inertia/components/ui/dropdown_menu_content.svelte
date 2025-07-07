<!--
  DropdownMenuContent Component - Svelte 5
-->

<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    sideOffset?: number
    align?: 'start' | 'center' | 'end'
    side?: 'top' | 'right' | 'bottom' | 'left'
    children?: Snippet
  }

  const {
    class: className,
    sideOffset = 4,
    align = 'center',
    side = 'bottom',
    children,
    ...restProps
  }: Props = $props()
</script>

<DropdownMenuPrimitive.Portal>
  <DropdownMenuPrimitive.Content
    data-slot="dropdown-menu-content"
    {sideOffset}
    {align}
    {side}
    class={cn(
      'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border-2 border-border p-1 shadow-neo',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
  </DropdownMenuPrimitive.Content>
</DropdownMenuPrimitive.Portal>
