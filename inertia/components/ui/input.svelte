<script lang="ts">
  import { cn } from "$lib/utils-svelte"

  interface Props {
    class?: string
    value?: string | number
    disabled?: boolean
    [key: string]: unknown
  }

  let { class: className, value = $bindable(""), disabled = false, ...restProps }: Props = $props()

  function handleInput(event: Event) {
    const nextValue = (event.currentTarget as HTMLInputElement).value
    if (disabled) {
      ;(event.currentTarget as HTMLInputElement).value = String(value)
      return
    }
    value = nextValue
  }
</script>

<input
  {disabled}
  value={value}
  oninput={handleInput}
  class={cn(
    "flex h-11 w-full rounded-lg border border-input bg-background",
    "px-3 py-2 text-sm font-medium font-mono",
    "text-foreground placeholder:text-muted-foreground",
    "shadow-suar-hairline",
    "transition-[border-color,box-shadow] duration-150",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25",
    "focus-visible:border-orange",
    "disabled:cursor-not-allowed disabled:opacity-50",
    className,
  )}
  {...restProps}
/>
