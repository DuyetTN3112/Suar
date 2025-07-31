<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLLIElement> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<li
  data-slot="sidebar-menu-item"
  data-sidebar="menu-item"
  class={cn('group/menu-item relative', className)}
  {...restProps}
>
  {@render children?.()}
</li>
