<!--
  RadioGroup Component - Svelte 5

  Port từ shadcn/ui React radio-group.
  Uses Bits UI RadioGroup primitive.
-->

<script lang="ts" module>
  export { default as RadioGroup } from './radio_group.svelte'
  export { default as RadioGroupItem } from './radio_group_item.svelte'
</script>

<script lang="ts">
  import { RadioGroup as RadioGroupPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    value?: string
    disabled?: boolean
    required?: boolean
    name?: string
    orientation?: 'horizontal' | 'vertical'
    onValueChange?: (value: string) => void
    children?: Snippet
  }

  const {
    class: className,
    value,
    onValueChange,
    children,
    ...restProps
  }: Props = $props()
</script>

<RadioGroupPrimitive.Root
  {value}
  {onValueChange}
  data-slot="radio-group"
  class={cn('grid gap-3', className)}
  {...restProps}
>
  {@render children?.()}
</RadioGroupPrimitive.Root>
