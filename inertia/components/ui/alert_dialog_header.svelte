<!--
  AlertDialogHeader Component - Svelte 5
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
  data-slot="alert-dialog-header"
  class={cn('flex flex-col gap-2 text-center sm:text-left', className)}
  {...restProps}
>
  {@render children?.()}
</div>
