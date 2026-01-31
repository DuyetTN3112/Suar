<script lang="ts">
  import { Dialog as SheetPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof SheetPrimitive.Close> & {
    children?: Snippet
  }

  const { children, ...restProps }: Props = $props()
</script>

<SheetPrimitive.Close {...restProps}>
  {@render children?.()}
</SheetPrimitive.Close>
