<!--
  DropdownMenuSub Component - Svelte 5
-->

<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: Snippet
  }

  let {
    open = $bindable(false),
    onOpenChange,
    children,
    ...restProps
  }: Props = $props()
</script>

<DropdownMenuPrimitive.Sub
  bind:open
  {onOpenChange}
  {...restProps}
>
  {@render children?.()}
</DropdownMenuPrimitive.Sub>
