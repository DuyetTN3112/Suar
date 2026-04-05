<!--
  Select Component - Svelte 5

  Port từ shadcn/ui React select.
  Uses Bits UI Select primitive.
-->

<script lang="ts" module>
  export { default as Select } from './select.svelte'
  export { default as SelectTrigger } from './select_trigger.svelte'
  export { default as SelectContent } from './select_content.svelte'
  export { default as SelectItem } from './select_item.svelte'
  export { default as SelectLabel } from './select_label.svelte'
  export { default as SelectGroup } from './select_group.svelte'
  export { default as SelectSeparator } from './select_separator.svelte'
</script>

<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    type?: 'single'
    value?: string
    open?: boolean
    disabled?: boolean
    required?: boolean
    name?: string
    onValueChange?: (value: string) => void
    onOpenChange?: (open: boolean) => void
    children?: Snippet
    [key: string]: unknown
  }

  // eslint-disable-next-line prefer-const
  let { value = $bindable(), open = $bindable(false), onValueChange, onOpenChange, children, ...restProps }: Props = $props()
</script>

<SelectPrimitive.Root
  type="single"
  {value}
  {open}
  {onValueChange}
  {onOpenChange}
  {...restProps}
>
  {@render children?.()}
</SelectPrimitive.Root>
