<!--
  Input Component - Svelte 5

  Port từ shadcn/ui React input.
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { HTMLInputAttributes } from 'svelte/elements'

  type Props = Omit<HTMLInputAttributes, 'value'> & {
    class?: string
    type?: string
    value?: string
  }

  const props: Props = $props()
  const className = $derived(props.class ?? '')
  const type = $derived(props.type ?? 'text')
  const restProps = $derived.by(() => {
    const {
      class: _className,
      type: _type,
      value: _value,
      ...rest
    } = props
    return rest
  })
</script>

<input
  type={type === 'search' ? 'text' : type}
  class={cn(
    'flex h-10 w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm font-medium shadow-neo-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-none disabled:cursor-not-allowed disabled:opacity-50',
    className
  )}
  bind:value={props.value}
  {...restProps}
/>
