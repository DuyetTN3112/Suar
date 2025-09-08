<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"
  type Props = HTMLAttributes<HTMLDivElement> & { class?: string; children?: Snippet }
  const { class: className, children, ...restProps }: Props = $props()
</script>

<div class={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)} {...restProps}>
  {@render children?.()}
</div>
