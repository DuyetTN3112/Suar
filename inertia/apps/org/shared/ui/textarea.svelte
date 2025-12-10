<script lang="ts">
  import type { HTMLTextareaAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  type Props = HTMLTextareaAttributes & {
    class?: string
    value?: string
    oninput?: (event: Event) => void
    onchange?: (event: Event) => void
  }

  let {
    class: className,
    value = $bindable(""),
    oninput,
    onchange,
    ...restProps
  }: Props = $props()

  function handleInput(event: Event) {
    value = (event.currentTarget as HTMLTextAreaElement).value
    oninput?.(event)
  }

  function handleChange(event: Event) {
    onchange?.(event)
  }
</script>

<textarea
  value={value}
  oninput={handleInput}
  onchange={handleChange}
  class={cn(
    "flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    className,
  )}
  {...restProps}
></textarea>
