<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    value?: string
    onValueChange?: (value: string) => void
    children?: Snippet
  }

  let { class: className, value = $bindable(""), onValueChange: _onValueChange, children, ...restProps }: Props = $props()
</script>

<div role="radiogroup" class={cn("grid gap-2", className)} {...restProps}>
  {@render children?.()}
</div>
