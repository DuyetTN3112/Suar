<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Dialog as SheetPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof SheetPrimitive.Title> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<SheetPrimitive.Title
  class={cn('text-foreground font-semibold', className)}
  {...restProps}
>
  {@render children?.()}
</SheetPrimitive.Title>
