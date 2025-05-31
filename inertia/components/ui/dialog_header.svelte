<!--
  DialogHeader Component - Svelte 5
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
  data-slot="dialog-header"
  class={cn('flex flex-col gap-2 text-center sm:text-left', className)}
  {...restProps}
>
  {@render children?.()}
</div>
