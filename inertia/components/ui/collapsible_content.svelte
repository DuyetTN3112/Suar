<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    children?: Snippet
    open?: boolean
  }

  const { class: className, children, open = false, ...restProps }: Props = $props()
</script>

{#if open}
<div class={cn(className)} {...restProps}>
  {@render children?.()}
</div>
{/if}
