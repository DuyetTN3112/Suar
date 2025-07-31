<script lang="ts">
  import { Dialog as SheetPrimitive, type DialogCloseProps } from 'bits-ui'

  type Props = DialogCloseProps

  const props: Props = $props()
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { children: _children, ...rest } = props
    return rest
  })
</script>

<SheetPrimitive.Close {...restProps}>
  {@render children?.()}
</SheetPrimitive.Close>
