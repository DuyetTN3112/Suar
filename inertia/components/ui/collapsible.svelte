<script lang="ts" module>
  export { default as Collapsible, default as Root } from './collapsible.svelte'
  export { default as CollapsibleTrigger, default as Trigger } from './collapsible_trigger.svelte'
  export { default as CollapsibleContent, default as Content } from './collapsible_content.svelte'
</script>

<script lang="ts">
  import { Collapsible as CollapsiblePrimitive, type CollapsibleRootProps } from 'bits-ui'

  type Props = CollapsibleRootProps

  const props: Props = $props()
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { children: _children, ...rest } = props
    return rest
  })
</script>

<CollapsiblePrimitive.Root data-slot="collapsible" {...restProps}>
  {@render children?.()}
</CollapsiblePrimitive.Root>
