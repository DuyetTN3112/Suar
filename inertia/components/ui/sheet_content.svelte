<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Dialog as SheetPrimitive } from 'bits-ui'
  import { X } from 'lucide-svelte'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof SheetPrimitive.Content> & {
    class?: string
    children?: Snippet
    side?: 'top' | 'right' | 'bottom' | 'left'
  }

  const {
    class: className,
    children,
    side = 'right',
    ...restProps
  }: Props = $props()
</script>

<SheetPrimitive.Portal>
  <SheetPrimitive.Overlay
    class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
  />
  <SheetPrimitive.Content
    class={cn(
      'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
      side === 'right' &&
        'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
      side === 'left' &&
        'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
      side === 'top' &&
        'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
      side === 'bottom' &&
        'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
    <SheetPrimitive.Close
      class="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
    >
      <X class="size-4" />
      <span class="sr-only">Close</span>
    </SheetPrimitive.Close>
  </SheetPrimitive.Content>
</SheetPrimitive.Portal>
