<!--
  Checkbox Component - Svelte 5

  Port từ shadcn/ui React checkbox.
  Uses Bits UI Checkbox primitive.
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Checkbox as CheckboxPrimitive } from 'bits-ui'
  import Check from 'lucide-svelte/icons/check'

  type Props = {
    class?: string
    checked?: boolean | 'indeterminate'
    disabled?: boolean
    required?: boolean
    name?: string
    value?: string
    id?: string
    onCheckedChange?: (checked: boolean | 'indeterminate') => void
  }

  let {
    class: className,
    checked = $bindable(false),
    onCheckedChange,
    ...restProps
  }: Props = $props()
</script>

<CheckboxPrimitive.Root
  bind:checked
  {onCheckedChange}
  class={cn(
    'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
    className
  )}
  {...restProps}
>
  {#snippet children({ checked })}
    <div class="flex items-center justify-center text-current">
      {#if checked === true}
        <Check class="h-4 w-4" />
      {/if}
    </div>
  {/snippet}
</CheckboxPrimitive.Root>
