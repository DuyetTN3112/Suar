<!--
  DropdownMenuShortcut Component - Svelte 5
-->

<script lang="ts">
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<span
  data-slot="dropdown-menu-shortcut"
  class={cn(
    'text-muted-foreground ml-auto text-xs tracking-widest',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</span>
