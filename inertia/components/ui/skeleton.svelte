<!--
  Skeleton Component - Svelte 5

  Port từ shadcn/ui React skeleton.
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
  }

  const { class: className, ...restProps }: Props = $props()
</script>

<div
  data-slot="skeleton"
  class={cn('bg-accent animate-pulse rounded-md border-2 border-border/30', className)}
  {...restProps}
></div>
