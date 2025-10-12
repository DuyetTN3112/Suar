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

export function definePaginationPolicy(
  overrides: Partial<PaginationPolicy> = {}
): PaginationPolicy {
  return {
    DEFAULT_PAGE: overrides.DEFAULT_PAGE ?? 1,
    DEFAULT_PER_PAGE: overrides.DEFAULT_PER_PAGE ?? 20,
    MAX_PER_PAGE: overrides.MAX_PER_PAGE ?? 100,
  }
}

export function toPageNumber(value: unknown, fallback = 1): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.trunc(parsed))
    }
  }

  return Math.max(1, Math.trunc(fallback))
}

export function toPerPageNumber(
  value: unknown,
  policy: PaginationPolicy,
  fallback = policy.DEFAULT_PER_PAGE
): number {
  const normalizedFallback = Math.min(policy.MAX_PER_PAGE, Math.max(1, Math.trunc(fallback)))

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(policy.MAX_PER_PAGE, Math.max(1, Math.trunc(value)))
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.min(policy.MAX_PER_PAGE, Math.max(1, Math.trunc(parsed)))
    }
  }

  return normalizedFallback
}

export function toLastPage(total: number, perPage: number): number {
  const safePerPage = Math.max(1, Math.trunc(perPage))
  return Math.max(1, Math.ceil(Math.max(0, total) / safePerPage))
}

export function toOffset(page: number, perPage: number): number {
  const safePage = Math.max(1, Math.trunc(page))
  const safePerPage = Math.max(1, Math.trunc(perPage))
  return (safePage - 1) * safePerPage
}

export function toWindowLimit(page: number, perPage: number): number {
  return toOffset(page, perPage) + Math.max(1, Math.trunc(perPage))
}

export function normalizePagination(
  input: PaginationInput,
  policy: PaginationPolicy,
  defaults: PaginationDefaults = {}
): NormalizedPagination {
  return {
    page: toPageNumber(input.page, defaults.page ?? policy.DEFAULT_PAGE),
    perPage: toPerPageNumber(
      input.perPage ?? input.limit,
      policy,
      defaults.perPage ?? policy.DEFAULT_PER_PAGE
    ),
  }
}

function readStrictPositiveInteger<TError extends Error>(
  value: unknown,
  fallback: number,
  lessThanOneMessage: string,
  errors: Pick<StrictPaginationErrors<TError>, 'createError'>
): number {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : fallback

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    throw errors.createError(lessThanOneMessage)
  }

  return Math.trunc(numericValue)
}

export function normalizeStrictPagination<TError extends Error = Error>(
  input: PaginationInput,
  policy: PaginationPolicy,
  defaults: PaginationDefaults = {},
  errors: StrictPaginationErrors<TError>
): NormalizedPagination {
  const page = readStrictPositiveInteger(
    input.page,
    defaults.page ?? policy.DEFAULT_PAGE,
    errors.pageLessThanOne,
    errors
  )
  const perPage = readStrictPositiveInteger(
    input.perPage ?? input.limit,
    defaults.perPage ?? policy.DEFAULT_PER_PAGE,
    errors.perPageLessThanOne,
    errors
  )

  if (perPage > policy.MAX_PER_PAGE) {
    throw errors.createError(errors.perPageTooLarge)
  }

  return { page, perPage }
}

export function buildPaginationMeta(
  total: number,
  pagination: NormalizedPagination
): PaginationMeta {
  const safeTotal = Math.max(0, total)

  return {
    total: safeTotal,
    perPage: pagination.perPage,
    currentPage: pagination.page,
    lastPage: toLastPage(safeTotal, pagination.perPage),
  }
}

export function slicePageItems<T>(items: T[], pagination: NormalizedPagination): T[] {
  const offset = toOffset(pagination.page, pagination.perPage)
  return items.slice(offset, offset + pagination.perPage)
}

export interface TimestampCursorPayload {
  createdAt: string
  id: string
}

export function encodeTimestampCursor(payload: TimestampCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodeTimestampCursor(cursor: string | undefined | null): TimestampCursorPayload | null {
  if (!cursor || typeof cursor !== 'string') {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<TimestampCursorPayload>
    if (
      typeof parsed.createdAt === 'string' &&
      parsed.createdAt.length > 0 &&
      typeof parsed.id === 'string' &&
      parsed.id.length > 0
    ) {
      return {
        createdAt: parsed.createdAt,
        id: parsed.id,
      }
    }
  } catch {
    return null
  }

  return null
}
