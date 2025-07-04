<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Command as CommandPrimitive, type CommandItemProps } from 'bits-ui'

  type Props = CommandItemProps

  const props: Props = $props()
  const className = $derived(props.class)
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { class: _className, children: _children, ...rest } = props
    return rest
  })
</script>

<CommandPrimitive.Item
  data-slot="command-item"
  class={cn(
    "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</CommandPrimitive.Item>
