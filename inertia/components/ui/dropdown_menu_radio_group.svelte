<!--
  DropdownMenuRadioGroup Component - Svelte 5
-->

<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  interface Props {
    class?: string
    value?: string
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

<DropdownMenuPrimitive.RadioGroup
  {value}
  {onValueChange}
  data-slot="dropdown-menu-radio-group"
  class={className}
  {...restProps}
>
  {@render children?.()}
</DropdownMenuPrimitive.RadioGroup>
