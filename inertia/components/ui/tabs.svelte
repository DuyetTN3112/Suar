<!--
  Tabs Component - Svelte 5

  Port từ shadcn/ui React tabs.
  Uses Bits UI Tabs primitive.
-->

<script lang="ts" module>
  export { default as Tabs } from './tabs.svelte'
  export { default as TabsList } from './tabs_list.svelte'
  export { default as TabsTrigger } from './tabs_trigger.svelte'
  export { default as TabsContent } from './tabs_content.svelte'
</script>

<script lang="ts">
  import { Tabs as TabsPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    value?: string
    onValueChange?: (value: string) => void
    orientation?: 'horizontal' | 'vertical'
    children?: Snippet
  }

  const {
    class: className,
    value,
    onValueChange,
    children,
    ...restProps
  }: Props = $props()
</script>

<TabsPrimitive.Root
  {value}
  {onValueChange}
  data-slot="tabs"
  class={cn('flex flex-col gap-2', className)}
  {...restProps}
>
  {@render children?.()}
</TabsPrimitive.Root>
