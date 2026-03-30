<script lang="ts">
  import { Dialog as SheetPrimitive, type DialogTriggerProps } from 'bits-ui'

  type Props = DialogTriggerProps

  const props: Props = $props()
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { children: _children, ...rest } = props
    return rest
  })
</script>

<SheetPrimitive.Trigger {...restProps}>
  {@render children?.()}
</SheetPrimitive.Trigger>
