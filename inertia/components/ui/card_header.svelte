<!--
  CardHeader Component - Svelte 5

  Port từ shadcn/ui React card.
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import type { Snippet } from 'svelte'

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<div class={cn('flex flex-col space-y-1.5 p-6', className)} {...restProps}>
  {@render children?.()}
</div>
