<script lang="ts">
  import { Command as CommandPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof CommandPrimitive.Empty> & {
    children?: Snippet
  }

  const { children, ...restProps }: Props = $props()
</script>

<CommandPrimitive.Empty
  data-slot="command-empty"
  class="py-6 text-center text-sm"
  {...restProps}
>
  {@render children?.()}
</CommandPrimitive.Empty>
