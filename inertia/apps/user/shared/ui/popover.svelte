<script lang="ts">
  import { Popover as PopoverPrimitive, type PopoverRootProps } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = PopoverRootProps & {
    children?: Snippet
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }

  let { children, open = $bindable(false), onOpenChange, ...restProps }: Props = $props()
</script>

<PopoverPrimitive.Root {open} onOpenChange={onOpenChange} {...restProps}>
  {@render children?.()}
</PopoverPrimitive.Root>
