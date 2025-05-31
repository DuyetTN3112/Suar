<!--
  DropdownMenuRadioGroup Component - Svelte 5
-->

<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    value?: string
    onValueChange?: (value: string) => void
    children?: Snippet
  }

  let {
    class: className,
    value = $bindable(''),
    onValueChange,
    children,
    ...restProps
  }: Props = $props()
</script>

<DropdownMenuPrimitive.RadioGroup
  bind:value
  {onValueChange}
  data-slot="dropdown-menu-radio-group"
  class={className}
  {...restProps}
>
  {@render children?.()}
</DropdownMenuPrimitive.RadioGroup>
