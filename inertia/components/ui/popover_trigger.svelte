<script lang="ts">
  import { Popover as PopoverPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof PopoverPrimitive.Trigger> & {
    children?: Snippet
  }

  const { children, ...restProps }: Props = $props()
</script>

<PopoverPrimitive.Trigger {...restProps}>
  {@render children?.()}
</PopoverPrimitive.Trigger>
