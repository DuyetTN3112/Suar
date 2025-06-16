<!--
  DropdownMenuLabel Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    inset?: boolean
    children?: Snippet
  }

  const { class: className, inset = false, children, ...restProps }: Props = $props()
</script>

<div
  data-slot="dropdown-menu-label"
  data-inset={inset}
  class={cn(
    'px-2 py-1.5 text-sm font-medium data-[inset]:pl-8',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
