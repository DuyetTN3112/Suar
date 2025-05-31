<script lang="ts" module>
  export { default as Table, default as Root } from './table.svelte'
  export { default as TableHeader } from './table_header.svelte'
  export { default as TableBody } from './table_body.svelte'
  export { default as TableFooter } from './table_footer.svelte'
  export { default as TableHead } from './table_head.svelte'
  export { default as TableRow } from './table_row.svelte'
  export { default as TableCell } from './table_cell.svelte'
  export { default as TableCaption } from './table_caption.svelte'
</script>

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { Snippet } from 'svelte'
  import type { HTMLTableAttributes } from 'svelte/elements'

  type Props = HTMLTableAttributes & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<div data-slot="table-container" class="relative w-full overflow-x-auto">
  <table
    data-slot="table"
    class={cn('w-full caption-bottom text-sm', className)}
    {...restProps}
  >
    {@render children?.()}
  </table>
</div>
