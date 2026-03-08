export interface CanonicalPageCursor {
  nextCursor: string | null
  previousCursor: string | null
}

export interface CanonicalPagePagination {
  mode: 'offset' | 'cursor'
  page: number
  perPage: number
  total: number
  lastPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  cursor?: CanonicalPageCursor
}

export interface CanonicalApiPagination {
  mode: 'offset' | 'cursor'
  page: number
  perPage: number
  total: number
  lastPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  nextCursor: string | null
  previousCursor: string | null
}

export interface CanonicalCursorMetaLike {
  nextCursor?: string | null
  previousCursor?: string | null
  hasNextPage?: boolean
  hasPreviousPage?: boolean
}

export interface CanonicalMetaLike {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  mode?: 'offset' | 'cursor'
  cursor?: CanonicalCursorMetaLike
}

export interface LegacySnakeCursorMetaLike {
  next_cursor: string | null
  previous_cursor: string | null
  has_next_page: boolean
  has_previous_page: boolean
}

export interface LegacySnakeMetaLike {
  total: number
  per_page: number
  current_page: number
  last_page: number
  cursor?: LegacySnakeCursorMetaLike
}

interface NormalizedCanonicalMeta {
  mode: 'offset' | 'cursor'
  page: number
  perPage: number
  total: number
  lastPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export function toCanonicalPagePagination(meta: CanonicalMetaLike): CanonicalPagePagination {
  const normalized = normalizeCanonicalMeta(meta)

  return {
    ...normalized,
    ...(meta.cursor
      ? {
          cursor: {
            nextCursor: meta.cursor.nextCursor ?? null,
            previousCursor: meta.cursor.previousCursor ?? null,
          },
        }
      : {}),
  }
}

export function toCanonicalApiPagination(meta: CanonicalMetaLike): CanonicalApiPagination {
  const normalized = normalizeCanonicalMeta(meta)

  return {
    ...normalized,
    nextCursor: meta.cursor?.nextCursor ?? null,
    previousCursor: meta.cursor?.previousCursor ?? null,
  }
}

function normalizeCanonicalMeta(meta: CanonicalMetaLike): NormalizedCanonicalMeta {
  const page = normalizePositiveInteger(meta.currentPage)
  const lastPage = normalizePositiveInteger(meta.lastPage)
  return {
    mode: resolveMode(meta),
    page,
    perPage: normalizePositiveInteger(meta.perPage),
    total: normalizeTotal(meta.total),
    lastPage,
    hasNextPage: meta.cursor?.hasNextPage ?? page < lastPage,
    hasPreviousPage: meta.cursor?.hasPreviousPage ?? page > 1,
  }
}

function resolveMode(meta: CanonicalMetaLike): 'offset' | 'cursor' {
  return meta.mode ?? (meta.cursor ? 'cursor' : 'offset')
}

function normalizePositiveInteger(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.trunc(value))
}

function normalizeTotal(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

export function fromLegacySnakePagination(meta: LegacySnakeMetaLike): CanonicalMetaLike {
  return {
    total: meta.total,
    perPage: meta.per_page,
    currentPage: meta.current_page,
    lastPage: meta.last_page,
    mode: meta.cursor ? 'cursor' : 'offset',
    ...(meta.cursor
      ? {
          cursor: {
            nextCursor: meta.cursor.next_cursor,
            previousCursor: meta.cursor.previous_cursor,
            hasNextPage: meta.cursor.has_next_page,
            hasPreviousPage: meta.cursor.has_previous_page,
          },
        }
      : {}),
  }
}

export function normalizeLegacySnakePagination(meta: LegacySnakeMetaLike): LegacySnakeMetaLike {
  const normalized = toCanonicalPagePagination(fromLegacySnakePagination(meta))

  return {
    total: normalized.total,
    per_page: normalized.perPage,
    current_page: normalized.page,
    last_page: normalized.lastPage,
    ...(meta.cursor
      ? {
          cursor: {
            next_cursor: normalized.cursor?.nextCursor ?? null,
            previous_cursor: normalized.cursor?.previousCursor ?? null,
            has_next_page: normalized.hasNextPage,
            has_previous_page: normalized.hasPreviousPage,
          },
        }
      : {}),
  }
}
