<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLLabelAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"
  type Props = HTMLLabelAttributes & { class?: string; children?: Snippet }
  const { class: className, children, ...restProps }: Props = $props()
</script>

<label class={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...restProps}>
  {@render children?.()}
</label>
