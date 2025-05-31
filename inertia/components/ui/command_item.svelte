<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Command as CommandPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof CommandPrimitive.Item> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
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
