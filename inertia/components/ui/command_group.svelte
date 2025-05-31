<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Command as CommandPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof CommandPrimitive.Group> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
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
