<!--
  TabsList Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Tabs as TabsPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<TabsPrimitive.List
  data-slot="tabs-list"
  class={cn(
    'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</TabsPrimitive.List>
