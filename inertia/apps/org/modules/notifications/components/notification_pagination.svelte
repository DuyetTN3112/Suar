<script lang="ts">
  import UnifiedCursorPagination from '@/apps/org/shared/ui/unified_cursor_pagination.svelte'
  import type { CursorPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    pagination: CursorPagePagination
    onLoadNewer?: () => void
    onLoadNewest?: () => void
    onLoadOlder?: () => void
  }

  const {
    pagination,
    onLoadNewer,
    onLoadNewest,
    onLoadOlder,
  }: Props = $props()
  const { t } = useTranslation()
</script>

<UnifiedCursorPagination
  {pagination}
  summary={t('notifications.feed_summary', {
    page: pagination.page,
    lastPage: pagination.lastPage,
    total: pagination.total,
  }, `Feed ${pagination.page}/${pagination.lastPage} · ${pagination.total} notifications`)}
  {onLoadNewer}
  onLoadNewest={onLoadNewest}
  onLoadOlder={onLoadOlder}
/>
