import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { normalizeStrictPagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { TASK_PAGINATION } from '#modules/tasks/actions/dtos/common/task_pagination'

interface RequestLike {
  input?: (key: string, defaultValue?: unknown) => unknown
  qs?: () => Record<string, unknown>
}

function readInput(request: RequestLike, key: string): unknown {
  const input = request.input?.(key)
  if (input !== undefined) return input
  return request.qs?.()[key]
}

function readNumericInput(value: unknown, field: 'page' | 'perPage'): number | string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return value
  }

  throw ValidationException.field(field, `${field} must be a number`)
}

export function buildTaskReadPaginationRequest(
  request: RequestLike
): { page: number; perPage: number } {
  const pagination = normalizeStrictPagination(
    {
      page: readNumericInput(readInput(request, 'page'), 'page'),
      perPage: readNumericInput(
        readInput(request, 'perPage') ?? readInput(request, 'per_page') ?? readInput(request, 'limit'),
        'perPage'
      ),
    },
    TASK_PAGINATION,
    {},
    {
      createError: (message) => new ValidationException(message),
      pageLessThanOne: 'page must be greater than 0',
      perPageLessThanOne: 'perPage must be greater than 0',
      perPageTooLarge: `perPage must be less than or equal to ${TASK_PAGINATION.MAX_PER_PAGE}`,
    }
  )

  return { page: pagination.page, perPage: pagination.perPage }
}
