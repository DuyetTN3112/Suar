import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type {
  ListMarketplaceTaskApplicationsInput,
  MarketplaceApplicationStatus,
} from '#modules/marketplace/actions/dtos/marketplace-application/marketplace_application'
import { buildMarketplaceTaskRouteRequest } from '#modules/marketplace/controllers/mappers/request/marketplace-application/marketplace_route_request_mapper'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'

const PAGINATION = { DEFAULT_PAGE: 1, DEFAULT_PER_PAGE: 20, MAX_PER_PAGE: 100 } as const
const STATUSES = new Set<MarketplaceApplicationStatus | 'all'>([
  'all',
  'pending',
  'approved',
  'rejected',
  'withdrawn',
])

export function buildListMarketplaceTaskApplicationsRequest(
  request: Pick<HttpContext['request'], 'input'>,
  params: unknown
): ListMarketplaceTaskApplicationsInput {
  const route = buildMarketplaceTaskRouteRequest(params)
  const status = readStatus(request.input('status'))
  const page = readPaginationValue(request.input('page'), 'page')
  const rawPerPage: unknown = request.input('perPage')
  const perPage = readPaginationValue(
    rawPerPage === undefined ? request.input('per_page') : rawPerPage,
    'perPage'
  )
  const pagination = normalizePagination({ page, perPage }, PAGINATION)

  return { taskId: route.taskId, status, page: pagination.page, perPage: pagination.perPage }
}

function readStatus(value: unknown): MarketplaceApplicationStatus | 'all' {
  if (value === undefined || value === '') return 'all'
  if (typeof value !== 'string' || !STATUSES.has(value as MarketplaceApplicationStatus | 'all')) {
    throw ValidationException.field('status', 'status must be a supported application status')
  }
  return value as MarketplaceApplicationStatus | 'all'
}

function readPaginationValue(value: unknown, field: string): unknown {
  if (value === undefined) return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))) {
    return value
  }
  throw ValidationException.field(field, `${field} must be a finite number`)
}
