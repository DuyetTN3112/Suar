<!--
  AlertDialogCancel Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()

  const cancelClass =
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold border-2 border-border shadow-neo transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-neo-none bg-background text-foreground hover:bg-accent'
</script>

<AlertDialogPrimitive.Cancel
  class={cn(cancelClass, className)}
  {...restProps}
>
  {@render children?.()}
</AlertDialogPrimitive.Cancel>
