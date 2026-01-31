<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Command as CommandPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof CommandPrimitive.List> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
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
