<!--
  AlertTitle Component - Svelte 5
-->

<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils-svelte'

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<div
  data-slot="alert-title"
  class={cn(
    'col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
