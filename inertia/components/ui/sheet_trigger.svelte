<script lang="ts">
  import { Dialog as SheetPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof SheetPrimitive.Trigger> & {
    children?: Snippet
  }

  const { children, ...restProps }: Props = $props()
</script>

<SheetPrimitive.Trigger {...restProps}>
  {@render children?.()}
</SheetPrimitive.Trigger>
