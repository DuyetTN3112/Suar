<!--
  SelectTrigger Component - Svelte 5
-->

<script lang="ts">
  import { Select as SelectPrimitive, type SelectTriggerProps } from 'bits-ui'
  import ChevronDown from 'lucide-svelte/icons/chevron-down'
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  type Props = SelectTriggerProps & {
    class?: string
    size?: 'sm' | 'default'
    placeholder?: string
    children?: Snippet
  }

  const {
    class: className,
    size = 'default',
    placeholder,
    children,
    ...restProps
  }: Props = $props()
</script>

<SelectPrimitive.Trigger
  data-slot="select-trigger"
  data-size={size}
  class={cn(
    "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex w-fit items-center justify-between gap-2 rounded-md border-2 bg-transparent px-3 py-2 text-sm font-medium whitespace-nowrap shadow-neo-sm transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else if placeholder}
    <span data-slot="select-value">{placeholder}</span>
  {/if}
  <ChevronDown class="size-4 opacity-50" />
</SelectPrimitive.Trigger>
