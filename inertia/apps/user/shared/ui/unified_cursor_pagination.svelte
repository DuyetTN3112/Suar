<script lang="ts">
  import CursorPagination from '@/apps/user/shared/ui/cursor_pagination.svelte'
  import type { CursorPagePagination } from '@/apps/user/shared/lib/pagination'

  interface Props {
    pagination: CursorPagePagination
    newerHref?: string | null
    newestHref?: string | null
    olderHref?: string | null
    onLoadNewer?: () => void
    onLoadNewest?: () => void
    onLoadOlder?: () => void
    summary?: string
    class?: string
  }

  const {
    pagination,
    newerHref = null,
    newestHref = null,
    olderHref = null,
    onLoadNewer,
    onLoadNewest,
    onLoadOlder,
    summary,
    class: className,
  }: Props = $props()

  const from = $derived(
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.perPage + 1
  )
  const to = $derived(Math.min(pagination.page * pagination.perPage, pagination.total))
  const shouldShowControls = $derived(pagination.hasPreviousPage || pagination.hasNextPage)
</script>

<div class={`flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`.trim()}>
  <span class="text-sm text-muted-foreground">{summary ?? `${from}-${to} / ${pagination.total}`}</span>

  {#if shouldShowControls}
    <div class="flex flex-col gap-2 sm:items-end">
      <span class="text-sm text-muted-foreground">{pagination.page} / {pagination.lastPage}</span>
      <CursorPagination
        hasPreviousPage={pagination.hasPreviousPage}
        hasNextPage={pagination.hasNextPage}
        {newerHref}
        {newestHref}
        {olderHref}
        {onLoadNewer}
        {onLoadNewest}
        {onLoadOlder}
        showNewestShortcut={pagination.hasPreviousPage}
      />
    </div>
  {/if}
</div>
