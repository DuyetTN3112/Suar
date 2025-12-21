<script lang="ts">
  import { setContext } from "svelte"
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  import { TABS_CONTEXT, type TabsContext } from "./tabs_context"

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    value?: string
    onValueChange?: (value: string) => void
    children?: Snippet
  }

  const {
    class: className,
    value = '',
    onValueChange,
    children,
    ...restProps
  }: Props = $props()

  let currentValue = $state('')
  const tabsId = `tabs-${Math.random().toString(36).slice(2, 10)}`

  $effect(() => {
    currentValue = value
  })

  setContext<TabsContext>(TABS_CONTEXT, {
    get value() {
      return currentValue
    },
    setValue(nextValue: string) {
      currentValue = nextValue
      onValueChange?.(nextValue)
    },
    getTriggerId(tabValue: string) {
      return `${tabsId}-trigger-${tabValue}`
    },
    getContentId(tabValue: string) {
      return `${tabsId}-content-${tabValue}`
    },
  })
</script>

<div class={cn("w-full", className)} {...restProps}>
  {@render children?.()}
</div>
