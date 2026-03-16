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

<thead
  data-slot="table-header"
  class={cn('[&_tr]:border-b-2 [&_tr]:border-border bg-accent/50', className)}
  {...restProps}
>
  {@render children?.()}
</thead>
