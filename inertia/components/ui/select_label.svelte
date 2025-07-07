<!--
  SelectLabel Component - Svelte 5
-->

<script lang="ts">
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<div
  data-slot="select-label"
  class={cn('text-muted-foreground px-2 py-1.5 text-xs', className)}
  {...restProps}
>
  {@render children?.()}
</div>
