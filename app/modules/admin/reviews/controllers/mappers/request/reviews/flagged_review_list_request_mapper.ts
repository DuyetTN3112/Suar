import { ADMIN_PAGINATION } from '#modules/admin/reviews/actions/dtos/common/reviews/admin_pagination'
import type { ListFlaggedReviewsDTO } from '#modules/admin/reviews/actions/queries/reviews/list_flagged_reviews_query'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import {
  AnomalyFlagType,
  AnomalySeverity,
  FlaggedReviewStatus,
} from '#modules/reviews/public_contracts/review_constants'

interface RequestLike {
  input(key: string, defaultValue?: unknown): unknown
}

const ADMIN_FLAGGED_REVIEWS_PER_PAGE = 50

type FlaggedReviewListRequest = Required<
  Pick<ListFlaggedReviewsDTO, 'page' | 'perPage' | 'after' | 'before'>
> &
  Omit<ListFlaggedReviewsDTO, 'page' | 'perPage' | 'after' | 'before'>

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw ValidationException.field(field, `${field} must be a string`)
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function optionalEnum<T extends string>(value: unknown, field: string, values: readonly T[]): T | undefined {
  const normalized = optionalString(value, field)
  if (normalized === undefined) return undefined
  if (!values.includes(normalized as T)) {
    throw ValidationException.field(field, `${field} is invalid`)
  }
  return normalized as T
}

function paginationValue(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return value
  }
  throw ValidationException.field(field, `${field} must be a number`)
}

export function buildFlaggedReviewListRequest(request: RequestLike): FlaggedReviewListRequest {
  const after = optionalString(request.input('after', null), 'after') ?? null
  const before = optionalString(request.input('before', null), 'before') ?? null
  const pagination = normalizePagination(
    {
      page: paginationValue(request.input('page', ADMIN_PAGINATION.DEFAULT_PAGE), 'page'),
      perPage: ADMIN_FLAGGED_REVIEWS_PER_PAGE,
    },
    ADMIN_PAGINATION,
    { perPage: ADMIN_FLAGGED_REVIEWS_PER_PAGE }
  )
  const search = optionalString(request.input('search', ''), 'search')
  const flagType = optionalEnum(
    request.input('flagType', request.input('flag_type', null)),
    'flag_type',
    Object.values(AnomalyFlagType)
  )
  const severity = optionalEnum(
    request.input('severity', null),
    'severity',
    Object.values(AnomalySeverity)
  )
  const status = optionalEnum(
    request.input('status', null),
    'status',
    Object.values(FlaggedReviewStatus)
  )

  return {
    page: after || before ? ADMIN_PAGINATION.DEFAULT_PAGE : pagination.page,
    perPage: ADMIN_FLAGGED_REVIEWS_PER_PAGE,
    after,
    before,
    ...(search === undefined ? {} : { search }),
    ...(flagType === undefined ? {} : { flagType }),
    ...(severity === undefined ? {} : { severity }),
    ...(status === undefined ? {} : { status }),
  }
}
