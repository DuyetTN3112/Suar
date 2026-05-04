<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"
  type Props = HTMLAttributes<HTMLTableRowElement> & { class?: string; children?: Snippet }
  const { class: className, children, ...restProps }: Props = $props()
</script>

<tr class={cn("border-b border-border/60 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)} {...restProps}>
  {@render children?.()}
</tr>
