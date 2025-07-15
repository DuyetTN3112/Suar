<!--
  AlertDialogTitle Component - Svelte 5
-->

<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<AlertDialogPrimitive.Title
  data-slot="alert-dialog-title"
  class={cn('text-lg font-semibold', className)}
  {...restProps}
>
  {@render children?.()}
</AlertDialogPrimitive.Title>
