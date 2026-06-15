<script lang="ts">
  import { Command as CommandPrimitive, type CommandEmptyProps } from 'bits-ui'

  type Props = CommandEmptyProps

  const props: Props = $props()
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { children: _children, ...rest } = props
    return rest
  })
</script>

<CommandPrimitive.Empty
  data-slot="command-empty"
  class="py-6 text-center text-sm"
  {...restProps}
>
  {@render children?.()}
</CommandPrimitive.Empty>
