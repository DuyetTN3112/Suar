<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils-svelte'

  type Props = HTMLAttributes<HTMLUListElement> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<ul
  data-slot="sidebar-menu"
  data-sidebar="menu"
  class={cn('flex w-full min-w-0 flex-col gap-1', className)}
  {...restProps}
>
  {@render children?.()}
</ul>
