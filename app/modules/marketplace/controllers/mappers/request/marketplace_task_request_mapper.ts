import type { HttpContext } from '@adonisjs/core/http'

import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import type { PublicTaskListingInput } from '#modules/tasks/public_contracts/public_task_listing'

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const

export type MarketplaceTaskListingInput = PublicTaskListingInput & {
  page: number
  per_page: number
  skill_categories: string[] | null
  skill_ids: string[] | null
  keyword: string | null
  difficulty: string | null
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  verification_method: string | null
  tech_stack: string | null
  domain_tags: string | null
  accepting_applications: 'open' | 'closed' | null
  sort_by: 'created_at' | 'due_date' | 'recommended'
  sort_order: 'asc' | 'desc'
}

function readAliasedInput(
  request: HttpContext['request'],
  camelKey: string,
  snakeKey: string,
  fallback?: unknown
): unknown {
  return request.input(camelKey, request.input(snakeKey, fallback))
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toOptionalStringArray(value: unknown): string[] | null {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  if (values.length === 0) {
    return null
  }

  const normalized = values
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)

  return normalized.length > 0 ? normalized : null
}

function readOptionalStringArrayAlias(
  request: HttpContext['request'],
  camelKey: string,
  snakeKey: string
): string[] | null {
  return (
    toOptionalStringArray(readAliasedInput(request, camelKey, snakeKey)) ??
    toOptionalStringArray(request.input(snakeKey) as unknown) ??
    toOptionalStringArray(request.input(camelKey) as unknown)
  )
}

function toPublicTaskSortBy(value: unknown): MarketplaceTaskListingInput['sort_by'] {
  if (value === 'recommended') return 'recommended'
  return value === 'due_date' ? 'due_date' : 'created_at'
}

function toPublicTaskSortOrder(value: unknown): MarketplaceTaskListingInput['sort_order'] {
  return value === 'asc' ? 'asc' : 'desc'
}

function toAcceptingApplications(value: unknown): MarketplaceTaskListingInput['accepting_applications'] {
  return value === 'open' || value === 'closed' ? value : null
}

export function buildGetMarketplaceTasksDTO(
  request: HttpContext['request']
): MarketplaceTaskListingInput {
  const pagination = normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE),
      perPage: readAliasedInput(request, 'perPage', 'per_page', PAGINATION.DEFAULT_PER_PAGE),
    },
    PAGINATION
  )

  return {
    page: pagination.page,
    per_page: pagination.perPage,
    skill_categories: readOptionalStringArrayAlias(request, 'skillCategories', 'skill_categories'),
    skill_ids: readOptionalStringArrayAlias(request, 'skillIds', 'skill_ids'),
    keyword: toOptionalString(request.input('keyword') as unknown),
    difficulty: toOptionalString(request.input('difficulty') as unknown),
    task_type: toOptionalString(readAliasedInput(request, 'taskType', 'task_type')),
    business_domain: toOptionalString(
      readAliasedInput(request, 'businessDomain', 'business_domain')
    ),
    problem_category: toOptionalString(
      readAliasedInput(request, 'problemCategory', 'problem_category')
    ),
    role_in_task: toOptionalString(readAliasedInput(request, 'roleInTask', 'role_in_task')),
    verification_method: toOptionalString(
      readAliasedInput(request, 'verificationMethod', 'verification_method')
    ),
    tech_stack: toOptionalString(readAliasedInput(request, 'techStack', 'tech_stack')),
    domain_tags: toOptionalString(readAliasedInput(request, 'domainTags', 'domain_tags')),
    accepting_applications: toAcceptingApplications(
      readAliasedInput(request, 'acceptingApplications', 'accepting_applications')
    ),
    sort_by: toPublicTaskSortBy(readAliasedInput(request, 'sortBy', 'sort_by', 'created_at')),
    sort_order: toPublicTaskSortOrder(
      readAliasedInput(request, 'sortOrder', 'sort_order', 'desc')
    ),
  }
}
