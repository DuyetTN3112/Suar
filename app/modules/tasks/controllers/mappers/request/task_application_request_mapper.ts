import type { HttpContext } from '@adonisjs/core/http'

import {
  PAGINATION,
  toApplicationStatusFilter,
  toOptionalNumericValue,
  toOptionalString,
  toOptionalStringArray,
  toPublicTaskSortBy,
  toPublicTaskSortOrder,
} from './shared.js'

import ValidationException from '#modules/http/exceptions/validation_exception'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import {
  ApplyForTaskDTO,
  GetPublicTasksDTO,
  GetTaskApplicationsDTO,
  ProcessApplicationDTO,
} from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { GetMyApplicationsInput } from '#modules/tasks/actions/queries/get_my_applications_query'
import {
  applyForTaskRequestValidator,
  processApplicationRequestValidator,
} from '#modules/tasks/validators/task'

const EMPTY_PROPOSAL_MESSAGE =
  'Hãy thêm lời nhắn hoặc ít nhất một proof link để người phụ trách đánh giá.'
const INVALID_PORTFOLIO_LINK_MESSAGE = 'Portfolio links must use http or https URLs.'
const MIN_APPLICATION_MESSAGE_LENGTH = 10
const MAX_APPLICATION_MESSAGE_LENGTH = 2000
const MAX_PORTFOLIO_LINKS = 5

function readAliasedInput(
  request: HttpContext['request'],
  camelKey: string,
  snakeKey: string,
  fallback?: unknown
): unknown {
  return request.input(camelKey, request.input(snakeKey, fallback))
}

function assertSafePortfolioLinks(links: string[] | undefined): void {
  if (!links) {
    return
  }

  if (links.length > MAX_PORTFOLIO_LINKS) {
    throw new ValidationException(`Portfolio links cannot exceed ${MAX_PORTFOLIO_LINKS} items.`)
  }

  if (new Set(links).size !== links.length) {
    throw new ValidationException('Portfolio links must be unique.')
  }

  const hasUnsafeLink = links.some((link) => {
    try {
      const url = new URL(link)
      return url.protocol !== 'http:' && url.protocol !== 'https:'
    } catch {
      return true
    }
  })

  if (hasUnsafeLink) {
    throw new ValidationException(INVALID_PORTFOLIO_LINK_MESSAGE)
  }
}

function assertSafeApplicationMessage(message: string | undefined): void {
  if (!message) {
    return
  }

  if (message.length < MIN_APPLICATION_MESSAGE_LENGTH) {
    throw new ValidationException(
      `Application message must be at least ${MIN_APPLICATION_MESSAGE_LENGTH} characters.`
    )
  }

  if (message.length > MAX_APPLICATION_MESSAGE_LENGTH) {
    throw new ValidationException(
      `Application message cannot exceed ${MAX_APPLICATION_MESSAGE_LENGTH} characters.`
    )
  }

  if (/<script\b[^>]*>/i.test(message) || /<\/script>/i.test(message)) {
    throw new ValidationException('Application message cannot include script tags.')
  }
}

export async function buildApplyForTaskDTO(
  request: HttpContext['request'],
  taskId: string
): Promise<ApplyForTaskDTO> {
  const messageInput = request.input('message') as unknown
  const message =
    typeof messageInput === 'string' && messageInput.trim().length > 0
      ? messageInput.trim()
      : undefined
  const rawPortfolioLinks = toOptionalStringArray(
    readAliasedInput(request, 'portfolioLinks', 'portfolio_links')
  )
  const portfolioLinks = rawPortfolioLinks?.map((link) => link.trim())
  assertSafeApplicationMessage(message)
  assertSafePortfolioLinks(portfolioLinks)

  if (!message && !portfolioLinks) {
    throw new ValidationException(EMPTY_PROPOSAL_MESSAGE)
  }

  const payload = await applyForTaskRequestValidator.validate({
    message,
    portfolio_links: portfolioLinks,
    application_source: readAliasedInput(
      request,
      'applicationSource',
      'application_source',
      'public_listing'
    ) as string,
  })

  return ApplyForTaskDTO.fromValidatedPayload(payload, taskId)
}

export async function buildProcessApplicationDTO(
  request: HttpContext['request'],
  applicationId: string
): Promise<ProcessApplicationDTO> {
  const payload = await processApplicationRequestValidator.validate({
    action: request.input('action') as 'approve' | 'reject',
    rejection_reason: readAliasedInput(request, 'rejectionReason', 'rejection_reason') as
      | string
      | undefined,
    assignment_type: readAliasedInput(
      request,
      'assignmentType',
      'assignment_type',
      'external_contributor'
    ) as string,
    estimated_hours: toOptionalNumericValue(
      readAliasedInput(request, 'estimatedHours', 'estimated_hours')
    ),
  })

  return ProcessApplicationDTO.fromValidatedPayload(payload, applicationId)
}

export function buildGetTaskApplicationsDTO(
  request: HttpContext['request'],
  taskId: string
): GetTaskApplicationsDTO {
  const pagination = normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE),
      perPage: readAliasedInput(request, 'perPage', 'per_page', PAGINATION.DEFAULT_PER_PAGE),
    },
    PAGINATION
  )

  return GetTaskApplicationsDTO.forTask(taskId, {
    status: toApplicationStatusFilter(request.input('status', 'all') as unknown),
    page: toPositiveNumber(
      request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      PAGINATION.DEFAULT_PAGE
    ),
    per_page: toPositiveNumber(
      request.input('per_page', PAGINATION.DEFAULT_PER_PAGE) as unknown,
      PAGINATION.DEFAULT_PER_PAGE
    ),
  })
}

export function buildGetPublicTasksDTO(request: HttpContext['request']): GetPublicTasksDTO {
  return GetPublicTasksDTO.fromFilters({
    page: toPositiveNumber(
      request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      PAGINATION.DEFAULT_PAGE
    ),
    per_page: toPositiveNumber(
      request.input('per_page', PAGINATION.DEFAULT_PER_PAGE) as unknown,
      PAGINATION.DEFAULT_PER_PAGE
    ),
    skill_ids: toOptionalStringArray(request.input('skill_ids') as unknown) ?? null,
    keyword: toOptionalString(request.input('keyword') as unknown) ?? null,
    difficulty: toOptionalString(request.input('difficulty') as unknown) ?? null,
    min_budget: toOptionalNumericValue(request.input('min_budget') as unknown) ?? null,
    max_budget: toOptionalNumericValue(request.input('max_budget') as unknown) ?? null,
    sort_by: toPublicTaskSortBy(request.input('sort_by', 'created_at') as unknown),
    sort_order: toPublicTaskSortOrder(request.input('sort_order', 'desc') as unknown),
  })
}

export function buildGetMyApplicationsInput(
  request: HttpContext['request']
): GetMyApplicationsInput {
  return {
    status: toApplicationStatusFilter(request.input('status', 'all') as unknown),
    page: toPositiveNumber(
      request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      PAGINATION.DEFAULT_PAGE
    ),
    per_page: toPositiveNumber(
      request.input('per_page', PAGINATION.DEFAULT_PER_PAGE) as unknown,
      PAGINATION.DEFAULT_PER_PAGE
    ),
  }
}
