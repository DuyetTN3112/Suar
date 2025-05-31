<!--
  DialogTitle Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Dialog as DialogPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<DialogPrimitive.Title
  data-slot="dialog-title"
  class={cn('text-lg leading-none font-semibold', className)}
  {...restProps}
>
  {@render children?.()}
</DialogPrimitive.Title>
