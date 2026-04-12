<!--
  DropdownMenuCheckboxItem Component - Svelte 5
-->

<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import Check from 'lucide-svelte/icons/check'
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    checked?: boolean
    disabled?: boolean
    onCheckedChange?: (checked: boolean) => void
    children?: Snippet
  }

  const {
    class: className,
    checked,
    onCheckedChange,
    children: childrenSnippet,
    ...restProps
  }: Props = $props()
</script>

<DropdownMenuPrimitive.CheckboxItem
  data-slot="dropdown-menu-checkbox-item"
  {checked}
  {onCheckedChange}
  class={cn(
    "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
>
  {#snippet children({ checked: isChecked })}
    <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      {#if isChecked}
        <Check class="size-4" />
      {/if}
    </span>
    {@render childrenSnippet?.()}
  {/snippet}
</DropdownMenuPrimitive.CheckboxItem>
