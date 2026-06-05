import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/actions/dtos/common/directory/organization_pagination'

type RequestLike = { input(key: string, defaultValue?: unknown): unknown }

function text(request: RequestLike, key: string): string | undefined {
  const value = request.input(key)
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw ValidationException.field(key, `${key} must be a string`)
  const result = value.trim()
  if (result.length > 200) throw ValidationException.field(key, `${key} cannot exceed 200 characters`)
  return result || undefined
}

function positive(
  request: RequestLike,
  key: string,
  fallback?: number,
  max?: number
): number | undefined {
  const value = request.input(key)
  if (value === undefined) return fallback
  const result =
    typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number(value)
      : typeof value === 'number'
        ? value
        : Number.NaN
  if (!Number.isSafeInteger(result) || result < 1) throw ValidationException.field(key, `${key} must be a positive integer`)
  if (max !== undefined && result > max) {
    throw ValidationException.field(key, `${key} cannot exceed ${max}`)
  }
  return result
}

function routeId(params: unknown): string {
  const value =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)['organizationId']
      : undefined
  if (typeof value !== 'string' || value.trim() === '') throw ValidationException.field('organizationId', 'organizationId is required')
  return value.trim()
}

export function buildApiListOrganizationsRequest(request: RequestLike) {
  const q = text(request, 'q')
  return q === undefined ? {} : { q }
}

export function buildShowOrganizationPageRequest(params: unknown, request: RequestLike) {
  const result: { organizationId: string; page?: number; perPage?: number } = { organizationId: routeId(params) }
  const page = positive(request, 'page')
  const perPage =
    positive(request, 'perPage', undefined, ORGANIZATION_PAGINATION.MAX_PER_PAGE) ??
    positive(request, 'per_page', undefined, ORGANIZATION_PAGINATION.MAX_PER_PAGE) ??
    positive(request, 'limit', undefined, ORGANIZATION_PAGINATION.MAX_PER_PAGE)
  if (page !== undefined) result.page = page
  if (perPage !== undefined) result.perPage = perPage
  return result
}

export function buildAllOrganizationsPageRequest(request: RequestLike) {
  const search = text(request, 'search')
  return {
    page: positive(request, 'page', 1) as number,
    perPage: 12,
    ...(search === undefined ? {} : { search }),
  }
}
