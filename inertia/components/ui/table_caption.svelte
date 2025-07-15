<script lang="ts">
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    children?: Snippet
    [key: string]: unknown
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<caption
  data-slot="table-caption"
  class={cn('text-muted-foreground mt-4 text-sm', className)}
  {...restProps}
>
  {@render children?.()}
</caption>
