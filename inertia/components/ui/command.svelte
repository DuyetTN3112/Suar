<script lang="ts" module>
  export { default as Command, default as Root } from './command.svelte'
  export { default as CommandDialog } from './command_dialog.svelte'
  export { default as CommandInput } from './command_input.svelte'
  export { default as CommandList } from './command_list.svelte'
  export { default as CommandEmpty } from './command_empty.svelte'
  export { default as CommandGroup } from './command_group.svelte'
  export { default as CommandItem } from './command_item.svelte'
  export { default as CommandShortcut } from './command_shortcut.svelte'
  export { default as CommandSeparator } from './command_separator.svelte'
</script>

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Command as CommandPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof CommandPrimitive.Root> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<CommandPrimitive.Root
  data-slot="command"
  class={cn(
    'bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</CommandPrimitive.Root>
