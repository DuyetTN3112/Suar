import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue, type ValidationIssue } from '#modules/errors/public_contracts/validation_issue'
import type {
  GetProjectBacklogDTO,
  ListProjectSprintsDTO,
} from '#modules/sprints/public_contracts/sprint_public_api'

type UnknownRecord = Record<string, unknown>

const MAX_PER_PAGE = 100

function asRecord(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.fromIssues([
      validationIssue(path, `${path} must be an object`, 'REQUEST_OBJECT_REQUIRED'),
    ])
  }
  return value as UnknownRecord
}

function readRouteProjectId(params: unknown, issues: ValidationIssue[]): string | undefined {
  const route = asRecord(params, 'params')
  const value = route['projectId']
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(
      validationIssue(
        'projectId',
        'projectId must be a non-empty string',
        'ROUTE_PARAMETER_INVALID'
      )
    )
    return undefined
  }
  return value.trim()
}

function readAlias(
  record: UnknownRecord,
  keys: readonly string[],
  path: string,
  issues: ValidationIssue[]
): unknown {
  const present = keys.filter((key) => Object.prototype.hasOwnProperty.call(record, key))
  if (present.length > 1) {
    const firstKey = keys[0] ?? 'first alias'
    const secondKey = keys[1] ?? 'second alias'
    issues.push(
      validationIssue(
        path,
        `Use either ${firstKey} or ${secondKey}, not both`,
        'REQUEST_ALIAS_CONFLICT'
      )
    )
  }
  return present.length > 0 ? record[present[0] as string] : undefined
}

function readPositiveInteger(
  value: unknown,
  path: string,
  code: string,
  issues: ValidationIssue[],
  maximum?: number
): number | undefined {
  if (value === undefined) return undefined

  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : Number.NaN

  if (!Number.isSafeInteger(numericValue) || numericValue < 1) {
    issues.push(
      validationIssue(
        path,
        `${path} must be a positive integer`,
        code
      )
    )
    return undefined
  }

  if (maximum !== undefined && numericValue > maximum) {
    issues.push(
      validationIssue(
        path,
        `${path} must be a positive integer no greater than ${maximum}`,
        code
      )
    )
    return undefined
  }

  return numericValue
}

function readStatuses(value: unknown, issues: ValidationIssue[]): string[] | undefined {
  if (value === undefined) return undefined

  if (Array.isArray(value)) {
    const statuses: string[] = []
    for (const [index, entry] of value.entries()) {
      if (typeof entry !== 'string' || entry.trim().length === 0) {
        issues.push(
          validationIssue(
            `status.${index}`,
            'status values must be non-empty strings',
            'BACKLOG_STATUS_INVALID'
          )
        )
        continue
      }
      statuses.push(entry.trim())
    }
    return statuses
  }

  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()]

  issues.push(
    validationIssue('status', 'status must be a non-empty string or an array of strings', 'BACKLOG_STATUS_INVALID')
  )
  return undefined
}

function throwIfInvalid(issues: readonly ValidationIssue[]): void {
  if (issues.length > 0) throw ValidationException.fromIssues(issues)
}

export function buildGetProjectBacklogRequest(
  params: unknown,
  query: unknown
): GetProjectBacklogDTO {
  const issues: ValidationIssue[] = []
  const projectId = readRouteProjectId(params, issues)
  const input = asRecord(query, 'query')
  const page = readPositiveInteger(input['page'], 'page', 'PAGINATION_PAGE_INVALID', issues)
  const perPage = readPositiveInteger(
    readAlias(input, ['perPage', 'per_page'], 'perPage', issues),
    'perPage',
    'PAGINATION_PER_PAGE_INVALID',
    issues,
    MAX_PER_PAGE
  )
  const status = readStatuses(input['status'], issues)

  throwIfInvalid(issues)
  return {
    project_id: projectId as string,
    ...(page !== undefined ? { page } : {}),
    ...(perPage !== undefined ? { per_page: perPage } : {}),
    ...(status !== undefined ? { status } : {}),
  }
}

export function buildListProjectSprintsRequest(
  params: unknown,
  query: unknown
): ListProjectSprintsDTO {
  const issues: ValidationIssue[] = []
  const projectId = readRouteProjectId(params, issues)
  const input = asRecord(query, 'query')
  const page = readPositiveInteger(input['page'], 'page', 'PAGINATION_PAGE_INVALID', issues)
  const perPage = readPositiveInteger(
    readAlias(input, ['perPage', 'per_page', 'limit'], 'perPage', issues),
    'perPage',
    'PAGINATION_PER_PAGE_INVALID',
    issues,
    MAX_PER_PAGE
  )

  throwIfInvalid(issues)
  return {
    projectId: projectId as string,
    ...(page !== undefined ? { page } : {}),
    ...(perPage !== undefined ? { perPage } : {}),
  }
}
