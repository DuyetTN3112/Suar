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
  data-slot="sidebar-group"
  data-sidebar="group"
  class={cn('relative flex w-full min-w-0 flex-col p-2', className)}
  {...restProps}
>
  {@render children?.()}
</div>
