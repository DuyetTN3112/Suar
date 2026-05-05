<script lang="ts">
  import { getContext } from "svelte"
  import type { Snippet } from "svelte"
  import type { HTMLButtonAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  import { TABS_CONTEXT, type TabsContext } from "./tabs_context"

  type Props = HTMLButtonAttributes & {
    class?: string
    value?: string
    active?: boolean
    children?: Snippet
  }

  const {
    class: className,
    value = "",
    active,
    children,
    onclick,
    ...restProps
  }: Props = $props()

  const tabs = getContext<TabsContext | undefined>(TABS_CONTEXT)
  const isActive = $derived(active ?? tabs?.value === value)
  const triggerId = $derived(value ? tabs?.getTriggerId(value) : undefined)
  const contentId = $derived(value ? tabs?.getContentId(value) : undefined)

  function handleClick(event: MouseEvent) {
    onclick?.(event as MouseEvent & { currentTarget: EventTarget & HTMLButtonElement })
    if (!event.defaultPrevented && value) {
      tabs?.setValue(value)
    }
  }
</script>

<button
  id={triggerId}
  type="button"
  role="tab"
  aria-selected={isActive}
  aria-controls={contentId}
  tabindex={isActive ? 0 : -1}
  data-state={isActive ? 'active' : 'inactive'}
  class={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-foreground ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", isActive && "bg-background text-foreground shadow-xs", !isActive && "opacity-80", className)}
  onclick={handleClick}
  {...restProps}
>
  {@render children?.()}
</button>
