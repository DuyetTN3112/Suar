<!--
  CardTitle Component - Svelte 5

  Port từ shadcn/ui React card.
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import type { Snippet } from 'svelte'

  type Props = HTMLAttributes<HTMLHeadingElement> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<h3
  class={cn('text-2xl font-bold leading-none tracking-tight', className)}
  {...restProps}
>
  {@render children?.()}
</h3>
