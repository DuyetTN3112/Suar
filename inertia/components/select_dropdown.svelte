<script lang="ts">
  import { Loader } from 'lucide-svelte'
  import { cn } from '$lib/utils-svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'

  interface SelectDropdownProps {
    onValueChange?: (value: string) => void
    defaultValue?: string
    placeholder?: string
    isPending?: boolean
    items?: { label: string; value: string }[]
    disabled?: boolean
    class?: string
    isControlled?: boolean
  }

  const {
    defaultValue,
    onValueChange,
    isPending = false,
    items = [],
    placeholder = 'Select',
    disabled = false,
    class: className = '',
    isControlled = false,
  }: SelectDropdownProps = $props()

  let value = $state('')
  let initialized = $state(false)

  $effect(() => {
    if (!initialized && !isControlled) {
      value = defaultValue ?? ''
      initialized = true
    }
  })

  function handleValueChange(newValue: string) {
    if (!isControlled) {
      value = newValue
    }
    onValueChange?.(newValue)
  }
</script>

<Select
  value={isControlled ? defaultValue : value}
  onValueChange={handleValueChange}
>
  <SelectTrigger {disabled} class={cn(className)}>
    <SelectValue {placeholder} />
  </SelectTrigger>
  <SelectContent>
    {#if isPending}
      <SelectItem disabled value="loading" class="h-14">
        <div class="flex items-center justify-center gap-2">
          <Loader class="h-5 w-5 animate-spin" />
          Loading...
        </div>
      </SelectItem>
    {:else}
      {#each items as item}
        <SelectItem value={item.value}>
          {item.label}
        </SelectItem>
      {/each}
    {/if}
  </SelectContent>
</Select>
