<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Command as CommandPrimitive } from 'bits-ui'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof CommandPrimitive.Separator> & {
    class?: string
  }

  const { class: className, ...restProps }: Props = $props()
</script>

<CommandPrimitive.Separator
  data-slot="command-separator"
  class={cn('bg-border -mx-1 h-px', className)}
  {...restProps}
/>
