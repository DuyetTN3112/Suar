<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    children?: Snippet
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }

  let { class: className, children, open = $bindable(false), onOpenChange: _onOpenChange, ...restProps }: Props = $props()
</script>

<div class={cn(className)} {...restProps}>
  {@render children?.()}
</div>

{#if open}
<div class="mt-2">
  <!-- Content rendered via CollapsibleContent -->
</div>
{/if}
