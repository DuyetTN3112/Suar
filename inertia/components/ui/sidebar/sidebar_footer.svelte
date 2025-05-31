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
  data-slot="sidebar-footer"
  data-sidebar="footer"
  class={cn('flex flex-col gap-2 p-2 group-data-[state=collapsed]:items-center', className)}
  {...restProps}
>
  {@render children?.()}
</div>
