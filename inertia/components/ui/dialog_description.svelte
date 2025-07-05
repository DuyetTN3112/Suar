<!--
  DialogDescription Component - Svelte 5
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

<DialogPrimitive.Description
  data-slot="dialog-description"
  class={cn('text-muted-foreground text-sm', className)}
  {...restProps}
>
  {@render children?.()}
</DialogPrimitive.Description>
