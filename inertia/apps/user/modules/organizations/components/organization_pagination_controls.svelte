<script lang="ts">
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'

  interface Props {
    pagination: OffsetPagePagination
    baseUrl?: string
    pageParam?: string
    queryParams?: Record<string, unknown>
    onPageChange?: (page: number) => void
  }

  const {
    pagination,
    baseUrl,
    pageParam = 'page',
    queryParams = {},
    onPageChange,
  }: Props = $props()
</script>

<UnifiedOffsetPagination {pagination} {baseUrl} {pageParam} {queryParams} {onPageChange} />
