<!--
  DropdownMenuSubTrigger Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import ChevronRight from 'lucide-svelte/icons/chevron-right'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    inset?: boolean
    children?: Snippet
  }

  const { class: className, inset = false, children, ...restProps }: Props = $props()
</script>

<DropdownMenuPrimitive.SubTrigger
  data-slot="dropdown-menu-sub-trigger"
  data-inset={inset}
  class={cn(
    'focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8',
    className
  )}
  {...restProps}
>
  {@render children?.()}
  <ChevronRight class="ml-auto size-4" />
</DropdownMenuPrimitive.SubTrigger>
