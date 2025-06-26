<script lang="ts">
  import { Tooltip as TooltipPrimitive, type TooltipTriggerProps } from 'bits-ui'

  type Props = TooltipTriggerProps

  const props: Props = $props()
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { children: _children, ...rest } = props
    return rest
  })
</script>

<TooltipPrimitive.Trigger {...restProps}>
  {@render children?.()}
</TooltipPrimitive.Trigger>
