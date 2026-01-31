<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<div
  data-slot="sidebar-rail"
  class={cn(
    'border-sidebar-muted bg-sidebar h-full w-mini border-r border-solid z-20 flex-none',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
