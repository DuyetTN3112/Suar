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
  data-slot="sidebar-group-content"
  data-sidebar="group-content"
  class={cn('w-full text-sm', className)}
  {...restProps}
>
  {@render children?.()}
</div>
