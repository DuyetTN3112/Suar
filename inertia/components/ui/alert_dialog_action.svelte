<!--
  AlertDialogAction Component - Svelte 5
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

<AlertDialogPrimitive.Action
  class={cn(buttonVariants(), className)}
  {...restProps}
>
  {@render children?.()}
</AlertDialogPrimitive.Action>
