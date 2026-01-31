<script lang="ts">
  import { Collapsible as CollapsiblePrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof CollapsiblePrimitive.Trigger> & {
    children?: Snippet
  }

  const { children, ...restProps }: Props = $props()
</script>

<CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...restProps}>
  {@render children?.()}
</CollapsiblePrimitive.Trigger>
