<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  type Props = HTMLAttributes<HTMLElement> & {
    class?: string
    children?: Snippet
    currentPage?: number
    totalPages?: number
    onPageChange?: (page: number) => void
    baseUrl?: string
    queryParams?: Record<string, unknown>
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<nav aria-label="pagination" class={cn("mx-auto flex w-full justify-center", className)} {...restProps}>
  {@render children?.()}
</nav>
