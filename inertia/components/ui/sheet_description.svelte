<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Dialog as SheetPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof SheetPrimitive.Description> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<SheetPrimitive.Description
  class={cn('text-muted-foreground text-sm', className)}
  {...restProps}
>
  {@render children?.()}
</SheetPrimitive.Description>
