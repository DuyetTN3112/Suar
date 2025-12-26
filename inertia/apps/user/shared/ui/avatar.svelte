<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"
  type Props = HTMLAttributes<HTMLDivElement> & { class?: string; children?: Snippet }
  const { class: className, children, ...restProps }: Props = $props()
</script>

<div class={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...restProps}>
  {@render children?.()}
</div>
