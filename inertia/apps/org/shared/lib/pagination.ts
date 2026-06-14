export interface CursorPaginationState {
  nextCursor: string | null
  previousCursor: string | null
}

export interface OffsetPagePagination {
  mode: 'offset'
  page: number
  perPage: number
  total: number
  lastPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface CursorPagePagination {
  mode: 'cursor'
  page: number
  perPage: number
  total: number
  lastPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  cursor?: CursorPaginationState
}

export type PagePagination = OffsetPagePagination | CursorPagePagination

interface OffsetPaginationInput {
  page?: number | null
  perPage?: number | null
  total?: number | null
  lastPage?: number | null
  hasNextPage?: boolean
  hasPreviousPage?: boolean
}

function normalizePositiveInteger(value: number | null | undefined, fallback = 1): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(1, Math.trunc(value))
}

function normalizeTotal(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.trunc(value))
}

export function buildOffsetPagination(input: OffsetPaginationInput): OffsetPagePagination {
  const perPage = normalizePositiveInteger(input.perPage)
  const total = normalizeTotal(input.total)
  const lastPage = normalizePositiveInteger(input.lastPage ?? Math.ceil(total / perPage))
  const page = Math.min(normalizePositiveInteger(input.page), lastPage)

  return {
    mode: 'offset',
    page,
    perPage,
    total,
    lastPage,
    hasNextPage: input.hasNextPage ?? page < lastPage,
    hasPreviousPage: input.hasPreviousPage ?? page > 1,
  }
}

export function paginateOffsetItems<T>(
  items: T[],
  pagination: Pick<OffsetPagePagination, 'page' | 'perPage'>
): T[] {
  const page = normalizePositiveInteger(pagination.page)
  const perPage = normalizePositiveInteger(pagination.perPage)
  const start = (page - 1) * perPage

  return items.slice(start, start + perPage)
}
