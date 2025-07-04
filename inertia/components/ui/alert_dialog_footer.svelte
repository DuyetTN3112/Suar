<!--
  AlertDialogFooter Component - Svelte 5
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
  data-slot="alert-dialog-footer"
  class={cn(
    'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
