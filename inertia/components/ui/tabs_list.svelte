<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  type Props = HTMLAttributes<HTMLDivElement> & { class?: string; children?: Snippet }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<div
  role="tablist"
  class={cn(
    "inline-flex h-10 items-center justify-center gap-1",
    "rounded-lg border border-border bg-secondary p-1",
    "text-foreground",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</div>
