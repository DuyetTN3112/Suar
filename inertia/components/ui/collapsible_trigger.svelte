<script lang="ts">
  import { Collapsible as CollapsiblePrimitive, type CollapsibleTriggerProps } from 'bits-ui'

  type Props = CollapsibleTriggerProps

  const props: Props = $props()
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { children: _children, ...rest } = props
    return rest
  })
</script>

<CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...restProps}>
  {@render children?.()}
</CollapsiblePrimitive.Trigger>
