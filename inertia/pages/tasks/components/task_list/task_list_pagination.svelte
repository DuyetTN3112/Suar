<script lang="ts">
  import Pagination from '@/components/ui/pagination.svelte'

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
        <option value="5">5</option>
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
      </select>
    </div>
    <div class="text-xs text-muted-foreground">
      Page {meta.current_page} of {meta.last_page}
    </div>
  </div>

  <Pagination
    baseUrl="/tasks"
    totalPages={meta.last_page}
    currentPage={meta.current_page}
    queryParams={filters}
  />
</div>
