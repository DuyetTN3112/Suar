<script lang="ts">
  import { getContext } from "svelte"
  import type { Snippet } from "svelte"

  import { cn } from "$lib/utils-svelte"

  import { SELECT_CONTEXT, type SelectContext } from "./select_context"

  interface Props {
    class?: string
    children?: Snippet
    align?: "start" | "center" | "end"
    side?: "top" | "right" | "bottom" | "left"
    sideOffset?: number
  }

  const { class: className, children, align = "center", side = "bottom", sideOffset = 4, ...restProps }: Props = $props()
  const select = getContext<SelectContext | undefined>(SELECT_CONTEXT)
  const alignmentClass = $derived(
    align === "start" ? "origin-top-left" : align === "end" ? "origin-top-right" : "origin-top"
  )
  const sideClass = $derived(side === "top" ? "bottom-full mb-1" : "top-full mt-1")
  const sideStyle = $derived(
    side === "top" ? `margin-bottom: ${sideOffset}px;` : `margin-top: ${sideOffset}px;`
  )
</script>

{#if (select?.open ?? false) || !(select?.hasOpened ?? false)}
  <div
    class={cn(
      "absolute left-0 z-50 max-h-60 min-w-[8rem] overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md",
      alignmentClass,
      sideClass,
      !select?.open && "hidden",
      className
    )}
    style={sideStyle}
    {...restProps}
  >
    {@render children?.()}
  </div>
{/if}
