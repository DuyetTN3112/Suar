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

<tbody
  data-slot="table-body"
  class={cn('[&_tr:last-child]:border-0', className)}
  {...restProps}
>
  {@render children?.()}
</tbody>
