<script lang="ts">
  import type { Snippet } from "svelte"

  import { cn } from "$lib/utils-svelte"

  interface Props {
    class?: string
    children?: Snippet
    disabled?: boolean
    onclick?: (e: MouseEvent) => void
  }

  const { class: className, children, disabled, onclick, ...restProps }: Props = $props()
</script>

<div
  class={cn(
    "relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
    className,
  )}
  {onclick}
  data-disabled={disabled ? "true" : undefined}
  {...restProps}
>
  {@render children?.()}
</div>
