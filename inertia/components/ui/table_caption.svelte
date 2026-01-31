<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLTableCaptionElement> & {
    class?: string
    children?: Snippet
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
