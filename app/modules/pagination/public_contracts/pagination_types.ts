export interface PaginationPolicy {
  DEFAULT_PAGE: number
  DEFAULT_PER_PAGE: number
  MAX_PER_PAGE: number
}

export interface PaginationInput {
  page?: unknown
  perPage?: unknown
  limit?: unknown
}

export interface NormalizedPagination {
  page: number
  perPage: number
}

export interface PaginationDefaults {
  page?: number
  perPage?: number
}

export interface StrictPaginationErrors<TError extends Error = Error> {
  createError(message: string): TError
  pageLessThanOne: string
  perPageLessThanOne: string
  perPageTooLarge: string
}

export interface PaginationMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

export interface CursorPage<TCursorItem> {
  items: TCursorItem[]
  nextCursor: string | null
  previousCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
}
