<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"
  type Props = HTMLAttributes<HTMLHeadingElement> & { class?: string; children?: Snippet }
  const { class: className, children, ...restProps }: Props = $props()
</script>

<h5 class={cn("mb-1 font-medium leading-none tracking-tight", className)} {...restProps}>
  {@render children?.()}
</h5>
