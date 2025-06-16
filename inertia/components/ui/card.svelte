<!--
  Card Component - Svelte 5

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

<div
  class={cn('rounded-md border-2 border-border bg-card text-card-foreground shadow-neo', className)}
  {...restProps}
>
  {@render children?.()}
</div>
