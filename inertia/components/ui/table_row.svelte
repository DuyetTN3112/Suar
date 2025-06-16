<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLTableRowElement> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<tr
  data-slot="table-row"
  class={cn(
    'hover:bg-accent/30 data-[state=selected]:bg-accent border-b-2 border-border transition-colors',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</tr>
