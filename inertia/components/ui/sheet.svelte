<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    children?: Snippet
    open?: boolean
    onOpenChange?: (open: boolean) => void
    side?: "top" | "right" | "bottom" | "left"
  }

  let { open = $bindable(false), ...props }: Props = $props()

  const getRestProps = () => {
    const {
      class: _className,
      children: _children,
      onOpenChange: _onOpenChange,
      side: _side,
      ...restProps
    } = props
    return restProps
  }
</script>

{#if open}
<div
  class="fixed inset-0 z-50 bg-black/80"
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
      "fixed z-50 gap-4 bg-background p-6 shadow-strong transition ease-in-out",
      props.side === "right" && "inset-y-0 right-0 w-3/4 max-w-sm",
      props.side === "left" && "inset-y-0 left-0 w-3/4 max-w-sm",
      props.side === "top" && "inset-x-0 top-0",
      props.side === "bottom" && "inset-x-0 bottom-0",
      props.class,
    )}
    {...getRestProps()}
  >
    {@render props.children?.()}
  </div>
</div>
{/if}
