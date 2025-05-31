<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLTableSectionElement> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<tfoot
  data-slot="table-footer"
  class={cn(
    'bg-muted/50 border-t font-medium [&>tr]:last:border-b-0',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</tfoot>
