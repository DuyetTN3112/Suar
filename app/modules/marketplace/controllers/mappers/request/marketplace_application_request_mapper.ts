import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/http/exceptions/validation_exception'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import {
  ApplyForTaskDTO,
  GetTaskApplicationsDTO,
  applyForTaskRequestValidator,
  type GetMyApplicationsInput,
  ProcessApplicationDTO,
  processApplicationRequestValidator,
  WithdrawApplicationDTO,
} from '#modules/tasks/public_contracts/task_application_flow'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const
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

function toOptionalNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function normalizeStringArray(value: unknown): string[] | undefined {
  const values = Array.isArray(value) ? value : []
  const normalized = values.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  ).map((item) => item.trim())

  return normalized.length > 0 ? normalized : undefined
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

function toTaskApplicationStatusFilter(value: unknown): ApplicationStatus | 'all' {
  switch (value) {
    case ApplicationStatus.PENDING:
      return ApplicationStatus.PENDING
    case ApplicationStatus.APPROVED:
      return ApplicationStatus.APPROVED
    case ApplicationStatus.REJECTED:
      return ApplicationStatus.REJECTED
    case ApplicationStatus.WITHDRAWN:
      return ApplicationStatus.WITHDRAWN
    default:
      return 'all'
  }
}

function toMyApplicationStatusFilter(value: unknown): NonNullable<GetMyApplicationsInput['status']> {
  switch (value) {
    case ApplicationStatus.PENDING:
      return 'pending'
    case ApplicationStatus.APPROVED:
      return 'approved'
    case ApplicationStatus.REJECTED:
      return 'rejected'
    case ApplicationStatus.WITHDRAWN:
      return 'withdrawn'
    default:
      return 'all'
  }
}

function readPagination(request: HttpContext['request']) {
  return normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE),
      perPage: readAliasedInput(request, 'perPage', 'per_page', PAGINATION.DEFAULT_PER_PAGE),
    },
    PAGINATION
  )
}

export async function buildApplyMarketplaceTaskDTO(
  request: HttpContext['request'],
  taskId: string
): Promise<ApplyForTaskDTO> {
  const message = normalizeOptionalString(request.input('message'))
  const portfolioLinks = normalizeStringArray(
    readAliasedInput(request, 'portfolioLinks', 'portfolio_links')
  )
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

export async function buildProcessMarketplaceApplicationDTO(
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

export function buildGetMarketplaceTaskApplicationsDTO(
  request: HttpContext['request'],
  taskId: string
): GetTaskApplicationsDTO {
  const pagination = readPagination(request)

  return GetTaskApplicationsDTO.forTask(taskId, {
    status: toTaskApplicationStatusFilter(request.input('status', 'all') as unknown),
    page: pagination.page,
    per_page: pagination.perPage,
  })
}

export function buildGetMyMarketplaceApplicationsInput(
  request: HttpContext['request']
): GetMyApplicationsInput {
  const pagination = readPagination(request)

  return {
    status: toMyApplicationStatusFilter(request.input('status', 'all') as unknown),
    page: pagination.page,
    per_page: pagination.perPage,
  }
}

export function buildWithdrawMarketplaceApplicationDTO(applicationId: string): WithdrawApplicationDTO {
  return WithdrawApplicationDTO.fromApplicationId(applicationId)
}
