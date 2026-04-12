<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils-svelte'

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
