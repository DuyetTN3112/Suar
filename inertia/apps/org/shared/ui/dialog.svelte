<script lang="ts">
  import { setContext } from 'svelte'
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    children?: Snippet
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }

  let { open = $bindable(false), ...props }: Props = $props()

  const getRestProps = () => {
    const { class: _className, children: _children, onOpenChange: _onOpenChange, ...restProps } = props
    return restProps
  }

  const dialogState = $state({
    contentClass: ''
  })
  setContext('dialog', dialogState)
</script>

{#if open}
<div
  class="fixed inset-0 z-50 bg-black/40"
  data-state="open"
  onclick={() => { open = false; props.onOpenChange?.(false) }}
  onkeydown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open = false
      props.onOpenChange?.(false)
    }
  }}
  role="button"
  tabindex="0"
>
  <div
    class={cn(
      "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-strong duration-200 sm:rounded-lg",
      dialogState.contentClass,
      props.class
    )}
    onclick={(e) => { e.stopPropagation(); }}
    {...getRestProps()}
  >
    {@render props.children?.()}
  </div>
</div>
{/if}
