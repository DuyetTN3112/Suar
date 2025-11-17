<script lang="ts">
  import { getContext } from "svelte"
  import type { Snippet } from "svelte"

  import { cn } from "$lib/utils-svelte"

  import { SELECT_CONTEXT, type SelectContext } from "./select_context"

  interface Props {
    class?: string
    children?: Snippet
    value?: string
    placeholder?: string
    disabled?: boolean
    id?: string
  }

  const { class: className, children, value: _value, placeholder: _placeholder, disabled, id, ...restProps }: Props = $props()
  const select = getContext<SelectContext | undefined>(SELECT_CONTEXT)

  function handleClick() {
    if (disabled ?? select?.disabled) return
    select?.toggleOpen()
  }
</script>

<button
  type="button"
  aria-expanded={select?.open}
  data-state={select?.open ? "open" : "closed"}
  disabled={disabled ?? select?.disabled}
  {id}
  class={cn(
    "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    className,
  )}
  onclick={handleClick}
  {...restProps}
>
  {@render children?.()}
</button>
