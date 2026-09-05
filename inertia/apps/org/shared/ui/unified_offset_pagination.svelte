<script lang="ts">
  import Pagination from '@/apps/org/shared/ui/pagination.svelte'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'

  interface Props {
    pagination: OffsetPagePagination
    baseUrl?: string
    pageParam?: string
    queryParams?: Record<string, unknown>
    onPageChange?: (page: number) => void
    class?: string
  }

  const {
    pagination,
    baseUrl,
    pageParam = 'page',
    queryParams = {},
    onPageChange,
    class: className = '',
  }: Props = $props()

  const from = $derived(
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.perPage + 1
  )
  const to = $derived(Math.min(pagination.page * pagination.perPage, pagination.total))
  const shouldShowControls = true
</script>

{#if pagination.total > 0}
  <div class={`flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}>
    <span class="text-sm text-muted-foreground">{from}-{to} / {pagination.total}</span>

    {#if shouldShowControls}
      <div class="flex flex-col gap-2 sm:items-end">
        <span class="text-xs font-medium text-muted-foreground">
          {pagination.page} / {pagination.lastPage}
        </span>
        <Pagination
          {baseUrl}
          {pageParam}
          {queryParams}
          {onPageChange}
          currentPage={pagination.page}
          totalPages={pagination.lastPage}
          class="justify-end"
        />
      </div>
    {/if}
  </div>
{/if}
