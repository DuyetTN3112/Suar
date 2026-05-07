import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { REVIEW_PAGINATION } from '#modules/reviews/public_contracts/review_pagination'

interface RequestLike {
  input(key: string, defaultValue?: unknown): unknown
}

export interface AdminDisputeListRequest {
  page: number
  perPage: number
  after: string | null
  before: string | null
  status: string | null
  search: string | null
  requestedOutcome: string | null
  finalDecision: string | null
}

export function buildAdminDisputeDetailRequest(params: unknown): { disputeId: string } {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw ValidationException.field('params', 'params must be an object')
  }
  const value = (params as Record<string, unknown>)['disputeId']
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field('disputeId', 'disputeId must be a non-empty string')
  }
  return { disputeId: value.trim() }
}

const MAX_FILTER_LENGTH = 160

function optionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') {
    throw ValidationException.field(field, `${field} must be a string`)
  }

  const normalized = value.trim()
  if (normalized.length > MAX_FILTER_LENGTH) {
    throw ValidationException.field(field, `${field} is too long`)
  }

  return normalized.length > 0 ? normalized : null
}

function paginationValue(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return value
  }
  throw ValidationException.field(field, `${field} must be a number`)
}

export function buildAdminDisputeListRequest(
  request: RequestLike
): AdminDisputeListRequest {
  const after = optionalString(request.input('after', null), 'after')
  const before = optionalString(request.input('before', null), 'before')
  const pagination = normalizePagination(
    {
      page: paginationValue(request.input('page', REVIEW_PAGINATION.DEFAULT_PAGE), 'page'),
      perPage: paginationValue(
        request.input(
          'perPage',
          request.input('per_page', REVIEW_PAGINATION.DEFAULT_PER_PAGE)
        ),
        'perPage'
      ),
    },
    REVIEW_PAGINATION
  )

  return {
    page: after || before ? REVIEW_PAGINATION.DEFAULT_PAGE : pagination.page,
    perPage: pagination.perPage,
    after,
    before,
    status: optionalString(request.input('status', null), 'status'),
    search: optionalString(request.input('search', null), 'search'),
    requestedOutcome: optionalString(
      request.input('requestedOutcome', request.input('requested_outcome', null)),
      'requested_outcome'
    ),
    finalDecision: optionalString(
      request.input('finalDecision', request.input('final_decision', null)),
      'final_decision'
    ),
  }
}
