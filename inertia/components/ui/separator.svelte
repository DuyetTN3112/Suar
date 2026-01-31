<!--
  Separator Component - Svelte 5

  Port từ shadcn/ui React separator.
  Uses Bits UI Separator primitive.
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Separator as SeparatorPrimitive } from 'bits-ui'

  type Props = {
    class?: string
    orientation?: 'horizontal' | 'vertical'
    decorative?: boolean
  }

  const {
    class: className,
    orientation = 'horizontal',
    decorative = true,
    ...restProps
  }: Props = $props()
</script>

<SeparatorPrimitive.Root
  data-slot="separator-root"
  {decorative}
  {orientation}
  class={cn(
    'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
    className
  )}
  {...restProps}
/>
