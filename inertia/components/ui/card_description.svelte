<!--
  CardDescription Component - Svelte 5

  Port từ shadcn/ui React card.
-->

<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils-svelte'

  type Props = HTMLAttributes<HTMLParagraphElement> & {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<p class={cn('text-sm text-muted-foreground', className)} {...restProps}>
  {@render children?.()}
</p>
