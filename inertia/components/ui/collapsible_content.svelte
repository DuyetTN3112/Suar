<script lang="ts">
  import { Collapsible as CollapsiblePrimitive, type CollapsibleContentProps } from 'bits-ui'

  type Props = CollapsibleContentProps

  const props: Props = $props()
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { children: _children, ...rest } = props
    return rest
  })
</script>

<CollapsiblePrimitive.Content data-slot="collapsible-content" {...restProps}>
  {@render children?.()}
</CollapsiblePrimitive.Content>
