<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"
  type Props = HTMLAttributes<HTMLDivElement> & { class?: string }
  const { class: className, children, ...restProps }: Props = $props()
</script>

<div class={cn("relative overflow-hidden", className)} {...restProps}>
  <div class="h-full w-full overflow-auto">
    {@render children?.()}
  </div>
</div>
