<script lang="ts" module>
  export { default as Collapsible, default as Root } from './collapsible.svelte'
  export { default as CollapsibleTrigger, default as Trigger } from './collapsible_trigger.svelte'
  export { default as CollapsibleContent, default as Content } from './collapsible_content.svelte'
</script>

<script lang="ts">
  import { Collapsible as CollapsiblePrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof CollapsiblePrimitive.Root> & {
    children?: Snippet
  }

  const { children, ...restProps }: Props = $props()
</script>

<CollapsiblePrimitive.Root data-slot="collapsible" {...restProps}>
  {@render children?.()}
</CollapsiblePrimitive.Root>
