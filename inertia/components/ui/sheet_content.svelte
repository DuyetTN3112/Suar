<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    children?: Snippet
    side?: "top" | "right" | "bottom" | "left"
  }

  const { class: className, children, side = "right", ...restProps }: Props = $props()
</script>

<div
  class={cn(
    "fixed z-50 gap-4 bg-background p-6 shadow-strong transition ease-in-out",
    side === "right" && "inset-y-0 right-0 w-3/4 max-w-sm",
    side === "left" && "inset-y-0 left-0 w-3/4 max-w-sm",
    side === "top" && "inset-x-0 top-0",
    side === "bottom" && "inset-x-0 bottom-0",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</div>
