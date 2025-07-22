<!--
  Label Component - Svelte 5

  Port từ shadcn/ui React label.
  Uses Bits UI Label primitive.
-->

<script lang="ts">
  import { Label as LabelPrimitive, type LabelRootProps } from 'bits-ui'

  import { cn } from '$lib/utils-svelte'

  type Props = LabelRootProps & {
    class?: string
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<LabelPrimitive.Root
  class={cn(
    'text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</LabelPrimitive.Root>
