<script lang="ts">
  import Pagination from '@/components/ui/pagination.svelte'
  import { FRONTEND_ROUTES, TASKS_UI } from '@/constants'

  interface Props {
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

  const { meta, rowsPerPage, onRowsPerPageChange, filters }: Props = $props()
  const rowOptions = TASKS_UI.ROWS_PER_PAGE_OPTIONS
</script>

<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 py-2 gap-2">
  <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-6 text-sm gap-2">
    <div class="flex items-center space-x-2">
      <span class="text-xs whitespace-nowrap">Rows per page</span>
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
      Page {meta.current_page} of {meta.last_page}
    </div>
  </div>

  <Pagination
    baseUrl={FRONTEND_ROUTES.TASKS}
    totalPages={meta.last_page}
    currentPage={meta.current_page}
    queryParams={filters}
  />
</div>
