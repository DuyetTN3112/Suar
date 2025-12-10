<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"
  type Props = HTMLAttributes<HTMLTableElement> & { class?: string; children?: Snippet }
  const { class: className, children, ...restProps }: Props = $props()
</script>

<div class="relative w-full overflow-auto">
  <table class={cn("w-full caption-bottom text-sm border-collapse", className)} {...restProps}>
    {@render children?.()}
  </table>
</div>
