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
  data-slot="sidebar-inset"
  class={cn(
    'bg-sidebar-inset h-full w-full overflow-auto border-0 border-solid z-10',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
