<script lang="ts">
  import { buildOffsetPagination } from '@/apps/org/shared/lib/pagination'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
  import { TASKS_UI } from '@/apps/org/modules/tasks/constants/tasks'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    baseRoute?: string
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
    rowsPerPage: number
    onRowsPerPageChange: (e: Event) => void
    filters: Record<string, unknown>
  }

  const { baseRoute = FRONTEND_ROUTES.TASKS, meta, rowsPerPage, onRowsPerPageChange, filters }: Props = $props()
  const rowOptions = TASKS_UI.ROWS_PER_PAGE_OPTIONS
  const { t } = useTranslation()
  const pagination = $derived<OffsetPagePagination>(buildOffsetPagination({
    total: meta.total,
    page: meta.current_page,
    perPage: meta.per_page,
    lastPage: meta.last_page,
  }))
</script>

<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 py-2 gap-2">
  <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-6 text-sm gap-2">
    <div class="flex items-center space-x-2">
      <span class="text-xs whitespace-nowrap">
        {t('ui_misc.tasks.pagination.rows_per_page', {}, 'Rows per page')}
      </span>
      <select
        value={rowsPerPage}
        onchange={onRowsPerPageChange}
        class="h-8 w-16 rounded-md border border-input text-xs"
      >
        {#each rowOptions as option}
          <option value={option}>{option}</option>
        {/each}
      </select>
    </div>
    <div class="text-xs text-muted-foreground">
      {t(
        'ui_misc.tasks.pagination.page_of',
        { page: pagination.page, total: pagination.lastPage },
        'Page :page of :total'
      )}
    </div>
  </div>

  <UnifiedOffsetPagination
    {pagination}
    baseUrl={baseRoute}
    queryParams={filters}
  />
</div>
