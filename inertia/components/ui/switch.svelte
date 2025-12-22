<script lang="ts">
  import { untrack } from "svelte"

  import { cn } from "$lib/utils-svelte"

  interface Props {
    class?: string
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
    id?: string
  }

  let {
    class: className = undefined,
    checked = $bindable(false),
    onCheckedChange = undefined,
    disabled = false,
    id = undefined,
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
  role="switch"
  aria-checked={checked}
  data-state={checked ? "checked" : "unchecked"}
  {disabled}
  {id}
  class={cn(
    "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
    className,
  )}
  onclick={handleClick}
  {...restProps}
>
  <span
    data-state={checked ? "checked" : "unchecked"}
    class="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
  ></span>
</button>
