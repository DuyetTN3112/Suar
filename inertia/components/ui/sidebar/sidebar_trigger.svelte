<script lang="ts">
  import { getContext } from 'svelte'
  import { cn } from '$lib/utils-svelte'
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  type Props = HTMLButtonAttributes & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()

  const sidebar = getContext<{
    toggleSidebar: () => void
  }>('sidebar')
</script>

<button
  type="button"
  data-slot="sidebar-trigger"
  aria-label="Toggle sidebar"
  class={cn('hidden p-2 text-muted-foreground hover:text-foreground', className)}
  onclick={sidebar.toggleSidebar}
  {...restProps}
>
  {@render children?.()}
</button>
