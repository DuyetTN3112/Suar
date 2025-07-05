<!--
  TabsTrigger Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Tabs as TabsPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    value: string
    disabled?: boolean
    children?: Snippet
  }

  const { class: className, value, children, ...restProps }: Props = $props()
</script>

<TabsPrimitive.Trigger
  {value}
  data-slot="tabs-trigger"
  class={cn(
    "data-[state=active]:bg-accent data-[state=active]:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border-2 border-transparent px-2 py-1 text-sm font-bold whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-border data-[state=active]:shadow-neo-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</TabsPrimitive.Trigger>
