<script lang="ts">
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import UnifiedCursorPagination from '@/apps/admin/shared/ui/unified_cursor_pagination.svelte'
  import type { CursorPagePagination } from '@/apps/admin/shared/lib/pagination'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    pagination: CursorPagePagination
    onLoadNewer: () => void
    onLoadNewest: () => void
    onLoadOlder: () => void
  }

  const { pagination, onLoadNewer, onLoadNewest, onLoadOlder }: Props = $props()
  const { t } = useTranslation()
</script>

{#if pagination.cursor}
  <Card class="border-border bg-card shadow-sm">
    <CardContent class="py-4">
      <UnifiedCursorPagination
        {pagination}
        summary={t(
          'task.admin_audit_logs.pagination_summary',
          { perPage: pagination.perPage, total: pagination.total },
          'Showing a :perPage-event window out of :total events'
        )}
        {onLoadNewer}
        {onLoadNewest}
        {onLoadOlder}
      />
    </CardContent>
  </Card>
{/if}
