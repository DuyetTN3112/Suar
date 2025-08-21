<!--
  DialogFooter Component - Svelte 5
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
  data-slot="dialog-footer"
  class={cn(
    'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
