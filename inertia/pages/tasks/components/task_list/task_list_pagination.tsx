import React from 'react'
import { Pagination } from '@/components/ui/pagination'

type TaskListPaginationProps = {
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
  rowsPerPage: number
  onRowsPerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  filters: unknown
}

export function TaskListPagination({
  meta,
  rowsPerPage,
  onRowsPerPageChange,
  filters
}: TaskListPaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 py-2 gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 text-sm gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs whitespace-nowrap">Rows per page</span>
          <select
            value={rowsPerPage}
            onChange={onRowsPerPageChange}
            className="h-8 w-16 rounded-md border border-input text-xs"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
        <div className="text-xs text-muted-foreground">
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
  )
}
