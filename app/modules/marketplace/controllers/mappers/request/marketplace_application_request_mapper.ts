import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type {
  DecideMarketplaceApplicationInput,
  ListCurrentApplicantApplicationsInput,
  ListOrganizationMarketplaceApplicationsInput,
  ListMarketplaceTaskApplicationsInput,
  MarketplaceApplicationStatus,
  SubmitMarketplaceApplicationInput,
  WithdrawMarketplaceApplicationInput,
} from '#modules/marketplace/actions/dtos/marketplace_application'
import {
  applyMarketplaceTaskRequestValidator,
  processMarketplaceApplicationRequestValidator,
} from '#modules/marketplace/validators/marketplace_application'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'

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
  const normalized = values
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())

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

function toTaskApplicationStatusFilter(value: unknown): MarketplaceApplicationStatus | 'all' {
  switch (value) {
    case 'pending':
      return 'pending'
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'withdrawn':
      return 'withdrawn'
    default:
      return 'all'
  }
}

function toMyApplicationStatusFilter(
  value: unknown
): NonNullable<ListCurrentApplicantApplicationsInput['status']> {
  switch (value) {
    case 'pending':
      return 'pending'
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'withdrawn':
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

interface ApplyMarketplaceTaskInput {
  message: string | undefined
  portfolio_links: string[] | undefined
  application_source: string
}

function readApplyMarketplaceTaskInput(request: HttpContext['request']): ApplyMarketplaceTaskInput {
  return {
    message: normalizeOptionalString(request.input('message')),
    portfolio_links: normalizeStringArray(
      readAliasedInput(request, 'portfolioLinks', 'portfolio_links')
    ),
    application_source: readAliasedInput(
      request,
      'applicationSource',
      'application_source',
      'public_listing'
    ) as string,
  }
}

function assertApplicationProposalIsUsable(input: ApplyMarketplaceTaskInput): void {
  assertSafeApplicationMessage(input.message)
  assertSafePortfolioLinks(input.portfolio_links)

  if (!input.message && !input.portfolio_links) {
    throw new ValidationException(EMPTY_PROPOSAL_MESSAGE)
  }
}

function readProcessMarketplaceApplicationInput(request: HttpContext['request']) {
  return {
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
  }
}

export async function buildApplyMarketplaceTaskDTO(
  request: HttpContext['request'],
  taskId: string
): Promise<SubmitMarketplaceApplicationInput> {
  const input = readApplyMarketplaceTaskInput(request)
  assertApplicationProposalIsUsable(input)

  const payload = await applyMarketplaceTaskRequestValidator.validate(input)

  return {
    taskId,
    message: payload.message ?? null,
    portfolioLinks: payload.portfolio_links ?? null,
    applicationSource: payload.application_source,
  }
}

export async function buildProcessMarketplaceApplicationDTO(
  request: HttpContext['request'],
  applicationId: string
): Promise<DecideMarketplaceApplicationInput> {
  const payload = await processMarketplaceApplicationRequestValidator.validate(
    readProcessMarketplaceApplicationInput(request)
  )

  return {
    applicationId,
    action: payload.action,
    rejectionReason: payload.rejection_reason ?? null,
    assignmentType: payload.assignment_type,
    estimatedHours: payload.estimated_hours ?? null,
  }
}

export function buildGetMarketplaceTaskApplicationsDTO(
  request: HttpContext['request'],
  taskId: string
): ListMarketplaceTaskApplicationsInput {
  const pagination = readPagination(request)

  return {
    taskId,
    status: toTaskApplicationStatusFilter(request.input('status', 'all') as unknown),
    page: pagination.page,
    perPage: pagination.perPage,
  }
}

export function buildGetMyMarketplaceApplicationsInput(
  request: HttpContext['request']
): ListCurrentApplicantApplicationsInput {
  const pagination = readPagination(request)

  return {
    status: toMyApplicationStatusFilter(request.input('status', 'all') as unknown),
    page: pagination.page,
    perPage: pagination.perPage,
  }
}

export function buildGetOrganizationMarketplaceApplicationsInput(
  request: HttpContext['request'],
  organizationId: string
): ListOrganizationMarketplaceApplicationsInput {
  const pagination = readPagination(request)

  return {
    organizationId,
    status: toTaskApplicationStatusFilter(request.input('status', 'pending') as unknown),
    page: pagination.page,
    perPage: pagination.perPage,
  }
}

export function buildWithdrawMarketplaceApplicationDTO(
  applicationId: string
): WithdrawMarketplaceApplicationInput {
  return { applicationId }
}
