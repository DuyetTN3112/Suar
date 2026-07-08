<script lang="ts">
  import { getContext } from "svelte"
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  import { TABS_CONTEXT, type TabsContext } from "./tabs_context"

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    value?: string
    active?: boolean
    children?: Snippet
  }

  const { class: className, value = "", active, children, ...restProps }: Props = $props()

  const tabs = getContext<TabsContext | undefined>(TABS_CONTEXT)
  const isActive = $derived(active ?? (tabs ? tabs.value === value : true))
  const triggerId = $derived(value ? tabs?.getTriggerId(value) : undefined)
  const contentId = $derived(value ? tabs?.getContentId(value) : undefined)
</script>

{#if isActive}
  <div
    id={contentId}
    role="tabpanel"
    aria-labelledby={triggerId}
    tabindex={0}
    data-state="active"
    class={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
    {...restProps}
  >
    {@render children?.()}
  </div>
{/if}
