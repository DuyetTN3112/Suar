<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<div
  data-slot="sheet-header"
  class={cn('flex flex-col gap-1.5 p-4', className)}
  {...restProps}
>
  {@render children?.()}
</div>
