<!--
  DropdownMenuSeparator Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'

  type Props = {
    class?: string
  }

  const { class: className, ...restProps }: Props = $props()
</script>

<DropdownMenuPrimitive.Separator
  data-slot="dropdown-menu-separator"
  class={cn('bg-border -mx-1 my-1 h-px', className)}
  {...restProps}
/>
