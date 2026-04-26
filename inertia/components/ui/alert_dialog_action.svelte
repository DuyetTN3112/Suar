<!--
  AlertDialogAction Component - Svelte 5
-->

<script lang="ts">
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    children?: Snippet
    disabled?: boolean
    onclick?: (e: MouseEvent) => void
  }

  const { class: className, children, onclick, ...restProps }: Props = $props()

  const actionClass =
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-border shadow-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50  hover:shadow-xs  active:shadow-none bg-primary text-primary-foreground'
</script>

<button
  type="button"
  class={cn(actionClass, className)}
  {onclick}
  {...restProps}
>
  {@render children?.()}
</button>
