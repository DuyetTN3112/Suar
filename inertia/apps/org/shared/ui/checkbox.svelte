<script lang="ts">
  import { untrack } from "svelte"

  import { cn } from "$lib/utils-svelte"

  interface Props {
    class?: string
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
    id?: string
    "aria-label"?: string
  }

  let {
    class: className = undefined,
    checked = $bindable(false),
    onCheckedChange = undefined,
    disabled = false,
    id = undefined,
    "aria-label": ariaLabel = undefined,
    ...restProps
  }: Props = $props()
  let element = $state<HTMLButtonElement | null>(null)

  $effect(() => {
    if (!element) return
    untrack(() => {
      ;(element as HTMLButtonElement & { checked?: boolean }).checked = checked
    })
  })

  function handleClick() {
    if (disabled) return
    checked = !checked
    if (element) {
      ;(element as HTMLButtonElement & { checked?: boolean }).checked = checked
    }
    onCheckedChange?.(checked)
  }
</script>

<button
  bind:this={element}
  type="button"
  role="checkbox"
  aria-checked={checked}
  aria-label={ariaLabel}
  data-state={checked ? "checked" : "unchecked"}
  {disabled}
  {id}
  class={cn(
    "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
    className,
  )}
  onclick={handleClick}
  {...restProps}
>
</button>
