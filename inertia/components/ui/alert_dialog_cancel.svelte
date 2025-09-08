<!--
  AlertDialogCancel Component - Svelte 5
-->

<script lang="ts">
  import type { Snippet } from 'svelte'
  import { getContext } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    children?: Snippet
    disabled?: boolean
    onclick?: (e: MouseEvent) => void
  }

  const { class: className, children, onclick, ...restProps }: Props = $props()

  const dialogState = getContext<{ close?: () => void }>('dialog')

  function handleClick(e: MouseEvent) {
    if (onclick) {
      onclick(e)
    }
    if (!e.defaultPrevented && dialogState.close) {
      dialogState.close()
    }
  }

  const cancelClass =
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-border shadow-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50  hover:shadow-xs  active:shadow-none bg-background text-foreground hover:bg-accent'
</script>

<button
  type="button"
  class={cn(cancelClass, className)}
  onclick={handleClick}
  {...restProps}
>
  {@render children?.()}
</button>
