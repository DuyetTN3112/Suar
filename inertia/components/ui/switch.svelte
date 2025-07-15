<!--
  Switch Component - Svelte 5

  Port từ shadcn/ui React switch.
  Uses Bits UI Switch primitive.
-->

<script lang="ts">
  import { Switch as SwitchPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    checked?: boolean
    disabled?: boolean
    required?: boolean
    name?: string
    value?: string
    id?: string
    onCheckedChange?: (checked: boolean) => void
  }

  const {
    class: className,
    checked,
    onCheckedChange,
    ...restProps
  }: Props = $props()
</script>

<SwitchPrimitive.Root
  {checked}
  {onCheckedChange}
  data-slot="switch"
  class={cn(
    'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border-2 border-border shadow-neo-sm transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
    className
  )}
  {...restProps}
>
  <SwitchPrimitive.Thumb
    data-slot="switch-thumb"
    class="bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
  />
</SwitchPrimitive.Root>
