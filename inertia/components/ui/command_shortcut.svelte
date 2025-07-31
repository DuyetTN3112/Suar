<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLSpanElement> & {
    class?: string
  }

  const { class: className, ...restProps }: Props = $props()
</script>

<span
  data-slot="command-shortcut"
  class={cn(
    'text-muted-foreground ml-auto text-xs tracking-widest',
    className
  )}
  {...restProps}
></span>
