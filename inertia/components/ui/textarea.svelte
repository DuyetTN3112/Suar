<!--
  Textarea Component - Svelte 5

  Port từ shadcn/ui React textarea.
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { HTMLTextAreaAttributes } from 'svelte/elements'

  type Props = Omit<HTMLTextAreaAttributes, 'value'> & {
    class?: string
    value?: string
  }

  const props: Props = $props()
  const className = $derived(props.class ?? '')
  const restProps = $derived.by(() => {
    const { class: _className, value: _value, ...rest } = props
    return rest
  })
</script>

<textarea
  data-slot="textarea"
  class={cn(
    'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border-2 bg-transparent px-3 py-2 text-base font-medium shadow-neo-sm transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:shadow-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    className
  )}
  bind:value={props.value}
  {...restProps}
></textarea>
