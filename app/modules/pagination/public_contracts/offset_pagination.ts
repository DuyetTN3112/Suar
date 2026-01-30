import type {
  NormalizedPagination,
  PaginationDefaults,
  PaginationInput,
  PaginationMeta,
  PaginationPolicy,
  StrictPaginationErrors,
} from './pagination_types.js'

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
  return normalizePositiveInteger(value, fallback)
}

export function toPerPageNumber(
  value: unknown,
  policy: PaginationPolicy,
  fallback = policy.DEFAULT_PER_PAGE
): number {
  const normalizedFallback = clampPerPage(fallback, policy)
  const parsedValue = parseFiniteNumber(value)
  return parsedValue === null ? normalizedFallback : clampPerPage(parsedValue, policy)
}

export function toLastPage(total: number, perPage: number): number {
  const safePerPage = clampPositiveInteger(perPage)
  return Math.max(1, Math.ceil(Math.max(0, total) / safePerPage))
}

export function toOffset(page: number, perPage: number): number {
  const safePage = clampPositiveInteger(page)
  const safePerPage = clampPositiveInteger(perPage)
  return (safePage - 1) * safePerPage
}

export function toWindowLimit(page: number, perPage: number): number {
  return toOffset(page, perPage) + clampPositiveInteger(perPage)
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
    (message) => errors.createError(message)
  )
  const perPage = readStrictPositiveInteger(
    input.perPage ?? input.limit,
    defaults.perPage ?? policy.DEFAULT_PER_PAGE,
    errors.perPageLessThanOne,
    (message) => errors.createError(message)
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

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const parsedValue = parseFiniteNumber(value)
  const valueOrFallback = parsedValue ?? fallback
  return Math.max(1, Math.trunc(valueOrFallback))
}

function clampPerPage(value: number, policy: PaginationPolicy): number {
  return Math.min(policy.MAX_PER_PAGE, clampPositiveInteger(value))
}

function clampPositiveInteger(value: number): number {
  return Math.max(1, Math.trunc(value))
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function readStrictPositiveInteger<TError extends Error>(
  value: unknown,
  fallback: number,
  lessThanOneMessage: string,
  createError: (message: string) => TError
): number {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : fallback

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    throw createError(lessThanOneMessage)
  }
  return Math.trunc(numericValue)
}
