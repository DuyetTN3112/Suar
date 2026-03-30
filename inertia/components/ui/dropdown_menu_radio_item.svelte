<!--
  DropdownMenuRadioItem Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import Circle from 'lucide-svelte/icons/circle'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    value: string
    disabled?: boolean
    children?: Snippet
  }

  const { class: className, value, children: childrenSnippet, ...restProps }: Props = $props()
</script>

<DropdownMenuPrimitive.RadioItem
  {value}
  data-slot="dropdown-menu-radio-item"
  class={cn(
    "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
>
  {#snippet children({ checked })}
    <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      {#if checked}
        <Circle class="size-2 fill-current" />
      {/if}
    </span>
    {@render childrenSnippet?.()}
  {/snippet}
</DropdownMenuPrimitive.RadioItem>
