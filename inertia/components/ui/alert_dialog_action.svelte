<!--
  AlertDialogAction Component - Svelte 5
-->

<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive, type AlertDialogActionProps } from 'bits-ui'
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  type Props = AlertDialogActionProps & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()

  const actionClass =
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold border-2 border-border shadow-neo transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-neo-none bg-primary text-primary-foreground'
</script>

<AlertDialogPrimitive.Action
  class={cn(actionClass, className)}
  {...restProps}
>
  {@render children?.()}
</AlertDialogPrimitive.Action>
