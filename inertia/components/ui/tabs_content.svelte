<!--
  TabsContent Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Tabs as TabsPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    value: string
    children?: Snippet
  }

  const { class: className, value, children, ...restProps }: Props = $props()
</script>

<TabsPrimitive.Content
  {value}
  data-slot="tabs-content"
  class={cn('flex-1 outline-none', className)}
  {...restProps}
>
  {@render children?.()}
</TabsPrimitive.Content>
