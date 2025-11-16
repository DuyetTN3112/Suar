<script lang="ts">
  /**
   * SimplePagination — prev/next pagination controls with page info.
   */
  import UnifiedCursorPagination from '@/apps/admin/shared/ui/unified_cursor_pagination.svelte'
  import UnifiedOffsetPagination from '@/apps/admin/shared/ui/unified_offset_pagination.svelte'

  import type { PagePagination } from '@/apps/admin/shared/lib/pagination'

  interface Props {
    pagination: PagePagination
    baseUrl: string
    extraParams?: Record<string, unknown>
  }

  const { pagination, baseUrl, extraParams = {} }: Props = $props()

  function buildHref(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => [key, String(value)])
    )
    const query = searchParams.toString()
    return query.length > 0 ? `${baseUrl}?${query}` : baseUrl
  }
</script>

{#if true}
  <div class="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
    {#if pagination.mode === 'cursor'}
      <UnifiedCursorPagination
        {pagination}
        newestHref={buildHref(extraParams)}
        newerHref={pagination.cursor?.previousCursor
          ? buildHref({
              ...extraParams,
              before: pagination.cursor.previousCursor,
            })
          : undefined}
        olderHref={pagination.cursor?.nextCursor
          ? buildHref({
              ...extraParams,
              after: pagination.cursor.nextCursor,
            })
          : undefined}
      />
    {:else}
      <UnifiedOffsetPagination
        {pagination}
        baseUrl={baseUrl}
        queryParams={extraParams}
      />
    {/if}
  </div>
{/if}
