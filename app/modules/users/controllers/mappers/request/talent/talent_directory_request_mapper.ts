import type { HttpContext } from '@adonisjs/core/http'

import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { USER_PAGINATION } from '#modules/users/actions/dtos/common/user_pagination'
import type { SearchTalentsDTO } from '#modules/users/actions/queries/search/search_talents_query'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


function readAliasedInput(
  request: HttpContext['request'],
  camelCaseKey: string,
  snakeCaseKey: string
): unknown {
  return (request.input(camelCaseKey) as unknown) ?? (request.input(snakeCaseKey) as unknown)
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function toOptionalStringArray(value: unknown): string[] | null {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  const normalized = values
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)

  return normalized.length > 0 ? normalized : null
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function toTalentSortBy(value: unknown): 'relevance' | 'trust_score' | 'completed_tasks' | 'name' {
  return value === 'trust_score' || value === 'completed_tasks' || value === 'name'
    ? value
    : 'relevance'
}

function toTalentSortOrder(value: unknown): 'asc' | 'desc' {
  return value === 'asc' ? 'asc' : 'desc'
}

export function readTalentDirectoryRequest(request: HttpContext['request']): SearchTalentsDTO {
  const pagination = normalizePagination(
    {
      page: request.input('page'),
      perPage:
        readAliasedInput(request, 'perPage', 'per_page') ?? (request.input('limit') as unknown),
    },
    USER_PAGINATION,
    { perPage: 10 }
  )
  const saved = request.input('saved') as unknown

  return omitUndefined({
    q: toOptionalString(request.input('q') as unknown),
    task_id: toOptionalString(readAliasedInput(request, 'taskId', 'task_id')),
    skill_categories: toOptionalStringArray(
      readAliasedInput(request, 'skillCategories', 'skill_categories')
    ),
    skill_ids: toOptionalStringArray(readAliasedInput(request, 'skillIds', 'skill_ids')),
    business_domain: toOptionalString(
      readAliasedInput(request, 'businessDomain', 'business_domain')
    ),
    task_type: toOptionalString(readAliasedInput(request, 'taskType', 'task_type')),
    problem_category: toOptionalString(
      readAliasedInput(request, 'problemCategory', 'problem_category')
    ),
    role_in_task: toOptionalString(readAliasedInput(request, 'roleInTask', 'role_in_task')),
    tech_stack: toOptionalString(readAliasedInput(request, 'techStack', 'tech_stack')),
    domain_tags: toOptionalString(readAliasedInput(request, 'domainTags', 'domain_tags')),
    sort_by: toTalentSortBy(readAliasedInput(request, 'sortBy', 'sort_by')),
    sort_order: toTalentSortOrder(readAliasedInput(request, 'sortOrder', 'sort_order')),
    saved: saved === true || saved === 'true' ? true : undefined,
    min_trust_score: toOptionalNumber(
      readAliasedInput(request, 'minTrustScore', 'min_trust_score')
    ),
    min_completed_tasks: toOptionalNumber(
      readAliasedInput(request, 'minCompletedTasks', 'min_completed_tasks')
    ),
    available_before: toOptionalString(
      readAliasedInput(request, 'availableBefore', 'available_before')
    ),
    min_proficiency: toOptionalString(
      readAliasedInput(request, 'minProficiency', 'min_proficiency')
    ),
    page: pagination.page,
    per_page: pagination.perPage,
  })
}
