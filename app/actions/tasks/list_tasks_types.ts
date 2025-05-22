/**
 * Types và interfaces cho chức năng list tasks
 */

export type FilterOptions = {
  page?: number
  limit?: number
  status?: number
  priority?: number
  label?: number
  search?: string
  assigned_to?: string
  parent_task_id?: string
  organization_id?: string
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    first_page: number
    next_page_url: string | null
    previous_page_url: string | null
  }
}

export interface TaskPaginator {
  all(): any[]
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
  getNextPageUrl(): string | null
  getPreviousPageUrl(): string | null
}

export interface AuthUser {
  id: number
  full_name?: string
  role?: {
    name: string
  }
  load(relation: string): Promise<void>
}
