<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Command as CommandPrimitive, type CommandListProps } from 'bits-ui'

  type Props = CommandListProps

  const props: Props = $props()
  const className = $derived(props.class)
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { class: _className, children: _children, ...rest } = props
    return rest
  })
</script>

<CommandPrimitive.List
  data-slot="command-list"
  class={cn(
    'max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</CommandPrimitive.List>
