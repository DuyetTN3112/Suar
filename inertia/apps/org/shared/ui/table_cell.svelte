<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLTdAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils-svelte'

  type Props = HTMLTdAttributes & {
    class?: string
    children?: Snippet
    colspan?: number
  }

  const { class: className, children, colspan, ...restProps }: Props = $props()
</script>

<td
  data-slot="table-cell"
  class={cn(
    'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
    className
  )}
  {colspan}
  {...restProps}
>
  {@render children?.()}
</td>
