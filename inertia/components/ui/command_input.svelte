<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Command as CommandPrimitive, type CommandInputProps } from 'bits-ui'
  import { Search } from 'lucide-svelte'

  type Props = CommandInputProps

  const props: Props = $props()
  const className = $derived(props.class)
  const restProps = $derived.by(() => {
    const { class: _className, ...rest } = props
    return rest
  })
</script>

<div
  data-slot="command-input-wrapper"
  class="flex h-9 items-center gap-2 border-b-2 border-border px-3"
>
  <Search class="size-4 shrink-0 opacity-50" />
  <CommandPrimitive.Input
    data-slot="command-input"
    class={cn(
      'placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...restProps}
  />
</div>
