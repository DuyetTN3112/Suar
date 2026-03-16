<!--
  SelectContent Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Select as SelectPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    position?: 'popper' | 'item-aligned'
    children?: Snippet
  }

  const {
    class: className,
    position = 'popper',
    children,
    ...restProps
  }: Props = $props()
</script>

<SelectPrimitive.Portal>
  <SelectPrimitive.Content
    data-slot="select-content"
    class={cn(
      'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border-2 border-border shadow-neo',
      position === 'popper' &&
        'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
      className
    )}
    {...restProps}
  >
    <SelectPrimitive.Viewport
      class={cn(
        'p-1',
        position === 'popper' &&
          'h-[var(--bits-select-trigger-height)] w-full min-w-[var(--bits-select-trigger-width)] scroll-my-1'
      )}
    >
      {@render children?.()}
    </SelectPrimitive.Viewport>
  </SelectPrimitive.Content>
</SelectPrimitive.Portal>
