<!--
  SidebarMenuSub - Sub menu container for nested menu items
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils-svelte'

  type Props = HTMLAttributes<HTMLUListElement> & {
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<ul
  data-sidebar="menu-sub"
  class={cn('mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5', className)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</ul>
