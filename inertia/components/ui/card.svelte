<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<!--
  Base card: white surface, 1px soft border, xs shadow.
  Matches design spec section 10.1.
  radius-2xl = calc(var(--radius) + 0.75rem) ≈ 20px
-->
<div
  class={cn(
    "rounded-2xl border border-border bg-card text-card-foreground shadow-suar-xs",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</div>
