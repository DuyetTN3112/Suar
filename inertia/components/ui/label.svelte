<!--
  Label Component - Svelte 5

  Port từ shadcn/ui React label.
  Uses Bits UI Label primitive.
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Label as LabelPrimitive, type LabelRootProps } from 'bits-ui'

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
