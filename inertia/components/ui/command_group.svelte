<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Command as CommandPrimitive, type CommandGroupProps } from 'bits-ui'

  type Props = CommandGroupProps

  const props: Props = $props()
  const className = $derived(props.class)
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { class: _className, children: _children, ...rest } = props
    return rest
  })
</script>

<CommandPrimitive.Group
  data-slot="command-group"
  class={cn(
    'text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</CommandPrimitive.Group>
