<!--
  AlertDialogCancel Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui'
  import { buttonVariants } from './button.svelte'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<AlertDialogPrimitive.Cancel
  class={cn(buttonVariants({ variant: 'outline' }), className)}
  {...restProps}
>
  {@render children?.()}
</AlertDialogPrimitive.Cancel>
