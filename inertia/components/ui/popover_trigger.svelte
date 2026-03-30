<script lang="ts">
  import { Popover as PopoverPrimitive, type PopoverTriggerProps } from 'bits-ui'

  type Props = PopoverTriggerProps

  const props: Props = $props()
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { children: _children, ...rest } = props
    return rest
  })
</script>

<PopoverPrimitive.Trigger {...restProps}>
  {@render children?.()}
</PopoverPrimitive.Trigger>
