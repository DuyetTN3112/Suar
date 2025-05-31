<!--
  SelectItem Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Select as SelectPrimitive } from 'bits-ui'
  import Check from 'lucide-svelte/icons/check'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    value: string
    label?: string
    disabled?: boolean
    children?: Snippet
  }

  const {
    class: className,
    value,
    label,
    disabled = false,
    children,
    ...restProps
  }: Props = $props()
</script>

<SelectPrimitive.Item
  {value}
  {label}
  {disabled}
  data-slot="select-item"
  class={cn(
    "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
>
  {#snippet children({ selected })}
    <span class="absolute right-2 flex size-3.5 items-center justify-center">
      {#if selected}
        <Check class="size-4" />
      {/if}
    </span>
    {#if children}
      {@render children()}
    {:else if label}
      {label}
    {:else}
      {value}
    {/if}
  {/snippet}
</SelectPrimitive.Item>
