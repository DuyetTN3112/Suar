<!--
  Checkbox Component - Svelte 5

  Port từ shadcn/ui React checkbox.
  Uses Bits UI Checkbox primitive.
-->

<script lang="ts">
  import { Checkbox as CheckboxPrimitive, type CheckboxRootProps } from 'bits-ui'
  import Check from 'lucide-svelte/icons/check'

  import { cn } from '$lib/utils-svelte'

  type Props = Omit<
    CheckboxRootProps,
    'checked' | 'indeterminate' | 'onCheckedChange' | 'onIndeterminateChange'
  > & {
    class?: string
    checked?: boolean | 'indeterminate'
    onCheckedChange?: (checked: boolean | 'indeterminate') => void
  }

  const {
    class: className,
    checked = false,
    onCheckedChange,
    ...restProps
  }: Props = $props()

  const resolvedChecked = $derived(checked === true)
  const indeterminate = $derived(checked === 'indeterminate')
</script>

<CheckboxPrimitive.Root
  checked={resolvedChecked}
  {indeterminate}
  onCheckedChange={(next) => onCheckedChange?.(next)}
  onIndeterminateChange={(next) => {
    if (next) {
      onCheckedChange?.('indeterminate')
    } else if (checked === 'indeterminate') {
      onCheckedChange?.(false)
    }
  }}
  class={cn(
    'peer h-4 w-4 shrink-0 rounded-sm border-2 border-border ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
    className
  )}
  {...restProps}
>
  {#snippet children({ checked: isChecked, indeterminate: isIndeterminate })}
    <div class="flex items-center justify-center text-current">
      {#if isChecked === true || isIndeterminate}
        <Check class="h-4 w-4" />
      {/if}
    </div>
  {/snippet}
</CheckboxPrimitive.Root>
