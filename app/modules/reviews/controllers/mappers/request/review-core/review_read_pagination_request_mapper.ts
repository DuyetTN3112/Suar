import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { normalizeStrictPagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { REVIEW_PAGINATION } from '#modules/reviews/public_contracts/review_pagination'

interface RequestLike {
  input(key: string, defaultValue?: unknown): unknown
}

const REVIEW_READ_DEFAULT_PER_PAGE = 10

function readNumericInput(
  value: unknown,
  field: 'page' | 'perPage'
): number | string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return value
  }

  throw ValidationException.field(field, `${field} must be a number`)
}

export function buildReviewReadPaginationRequest(
  request: RequestLike
): { page: number; perPage: number } {
  const pagination = normalizeStrictPagination(
    {
      page: readNumericInput(request.input('page'), 'page'),
      perPage: readNumericInput(
        request.input('perPage') ?? request.input('per_page') ?? request.input('limit'),
        'perPage'
      ),
    },
    REVIEW_PAGINATION,
    { perPage: REVIEW_READ_DEFAULT_PER_PAGE },
    {
      createError: (message) => new ValidationException(message),
      pageLessThanOne: 'page must be greater than 0',
      perPageLessThanOne: 'perPage must be greater than 0',
      perPageTooLarge: `perPage must be less than or equal to ${REVIEW_PAGINATION.MAX_PER_PAGE}`,
    }
  )

  return {
    page: pagination.page,
    perPage: pagination.perPage,
  }
}
