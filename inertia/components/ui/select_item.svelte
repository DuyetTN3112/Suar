<script lang="ts">
  import { getContext } from "svelte"
  import type { Snippet } from "svelte"

  import { cn } from "$lib/utils-svelte"

  import { SELECT_CONTEXT, type SelectContext } from "./select_context"

  interface Props {
    class?: string
    value?: string
    children?: Snippet
    disabled?: boolean
    label?: string
  }

  const { class: className, value, children, disabled, label, ...restProps }: Props = $props()
  const select = getContext<SelectContext | undefined>(SELECT_CONTEXT)
  let element = $state<HTMLDivElement | null>(null)

  $effect(() => {
    if (!select || !value || !element) return
    const textLabel = label ?? element.textContent.trim()
    return select.registerItem(value, textLabel)
  })

  function handleClick() {
    if (disabled || !value) return
    select?.setValue(value)
  }
</script>

<div
  bind:this={element}
  class={cn(
    "relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
    className,
  )}
  data-value={value}
  data-disabled={disabled}
  onclick={handleClick}
  {...restProps}
>
  {@render children?.()}
</div>
