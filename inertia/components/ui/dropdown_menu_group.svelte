<!--
  DropdownMenuGroup Component - Svelte 5
-->

<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  interface Props {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<DropdownMenuPrimitive.Group
  data-slot="dropdown-menu-group"
  class={className}
  {...restProps}
>
  {@render children?.()}
</DropdownMenuPrimitive.Group>
