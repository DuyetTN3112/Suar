<script lang="ts">
  import { Command as CommandPrimitive, type CommandSeparatorProps } from 'bits-ui'

  import { cn } from '$lib/utils-svelte'

  type Props = CommandSeparatorProps

  const props: Props = $props()
  const className = $derived(props.class)
  const restProps = $derived.by(() => {
    const { class: _className, ...rest } = props
    return rest
  })
</script>

<CommandPrimitive.Separator
  data-slot="command-separator"
  class={cn('bg-border -mx-1 h-px', className)}
  {...restProps}
/>
