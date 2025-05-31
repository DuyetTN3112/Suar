<script lang="ts">
  import { Collapsible as CollapsiblePrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof CollapsiblePrimitive.Content> & {
    children?: Snippet
  }

  const { children, ...restProps }: Props = $props()
</script>

<CollapsiblePrimitive.Content data-slot="collapsible-content" {...restProps}>
  {@render children?.()}
</CollapsiblePrimitive.Content>
