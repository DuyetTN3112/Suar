<!--
  TabsList Component - Svelte 5
-->

<script lang="ts">
  import { Tabs as TabsPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<TabsPrimitive.List
  data-slot="tabs-list"
  class={cn(
    'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-md border-2 border-border p-[3px] shadow-neo-sm',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</TabsPrimitive.List>
