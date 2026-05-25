import { ADMIN_PAGINATION } from '#modules/admin/users/actions/dtos/common/users/admin_pagination'
import type { ListUsersDTO } from '#modules/admin/users/actions/queries/users/list_users_query'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import {
  SYSTEM_ROLE_VALUES,
  USER_STATUS_VALUES,
} from '#modules/users/public_contracts/user_constants'

const ADMIN_USERS_PER_PAGE = 20

type AdminUserListRequest = Required<Pick<ListUsersDTO, 'page' | 'perPage'>> &
  Omit<ListUsersDTO, 'page' | 'perPage'>

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.field('query', 'query must be an object')
  }
  return value as Record<string, unknown>
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw ValidationException.field(field, `${field} must be a string`)
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function optionalEnum(
  value: unknown,
  field: string,
  values: readonly string[]
): string | undefined {
  const normalized = optionalString(value, field)
  if (normalized === undefined) return undefined
  if (!values.includes(normalized)) {
    throw ValidationException.field(field, `${field} is invalid`)
  }
  return normalized
}

function paginationValue(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return value
  }
  throw ValidationException.field('page', 'page must be a number')
}

export function buildAdminUserListRequest(query: unknown): AdminUserListRequest {
  const values = asRecord(query)
  const pagination = normalizePagination(
    { page: paginationValue(values['page']), perPage: ADMIN_USERS_PER_PAGE },
    ADMIN_PAGINATION,
    { perPage: ADMIN_USERS_PER_PAGE }
  )
  const search = optionalString(values['search'], 'search')
  const systemRole = optionalEnum(
    values['system_role'] ?? values['systemRole'],
    'system_role',
    SYSTEM_ROLE_VALUES
  )
  const status = optionalEnum(values['status'], 'status', USER_STATUS_VALUES)

  return {
    page: pagination.page,
    perPage: ADMIN_USERS_PER_PAGE,
    ...(search === undefined ? {} : { search }),
    ...(systemRole === undefined ? {} : { systemRole }),
    ...(status === undefined ? {} : { status }),
  }
}
