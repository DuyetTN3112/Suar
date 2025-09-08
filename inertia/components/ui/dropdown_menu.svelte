<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  interface Props {
    class?: string
    children?: Snippet
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }

  let { class: _className, children, open = $bindable(false), onOpenChange, ...restProps }: Props = $props()
</script>

<DropdownMenuPrimitive.Root {open} onOpenChange={onOpenChange} {...restProps}>
  {@render children?.()}
</DropdownMenuPrimitive.Root>
