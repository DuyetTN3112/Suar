import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildOrganizationsListDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationsIndexPageProps } from './mappers/response/organization_response_mapper.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/directory/actions/dtos/common/organization_pagination'
import { GetOrganizationsListDTO } from '#modules/organizations/directory/actions/dtos/request/get_organizations_list_dto'
import { OrganizationPortfolioQueryFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_portfolio_query_factory'

function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.trunc(parsed))
    }
  }

  return fallback
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function toOrganizationsTab(value: unknown): 'joined' | 'available' {
  return value === 'available' ? 'available' : 'joined'
}

/**
 * GET /organizations
 * Display organizations list for current user
 */
@inject()
export default class ListOrganizationsController {
  constructor(private readonly portfolioQueries: OrganizationPortfolioQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { auth, inertia, request } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const user = auth.user

    const joinedPage = toPositiveNumber(
      request.input('joined_page', ORGANIZATION_PAGINATION.DEFAULT_PAGE) as unknown,
      ORGANIZATION_PAGINATION.DEFAULT_PAGE
    )
    const availablePage = toPositiveNumber(
      request.input('available_page', ORGANIZATION_PAGINATION.DEFAULT_PAGE) as unknown,
      ORGANIZATION_PAGINATION.DEFAULT_PAGE
    )
    const search = toOptionalString(request.input('search') as unknown)
    const tab = toOrganizationsTab(request.input('tab') as unknown)
    const dto = buildOrganizationsListDTO(request, ORGANIZATION_PAGINATION.DEFAULT_PER_PAGE)
    const pageData = await this.portfolioQueries.makeIndexPage(actionContextFromHttp(ctx)).execute({
      joined: new GetOrganizationsListDTO(
        joinedPage,
        dto.limit,
        search,
        dto.sortBy,
        dto.sortOrder,
        dto.plan,
        dto.partnerType,
        dto.partnerIsActive,
        dto.createdAtStart,
        dto.createdAtEnd
      ),
      available: omitUndefined({
        userId: user.id,
        page: availablePage,
        perPage: ORGANIZATION_PAGINATION.DEFAULT_PER_PAGE,
        search,
        plan: dto.plan,
        partnerType: dto.partnerType,
        partnerIsActive: dto.partnerIsActive,
        createdAtStart: dto.createdAtStart,
        createdAtEnd: dto.createdAtEnd,
      }),
    })

    return inertia.render(
      'organizations/index',
      mapOrganizationsIndexPageProps({
        joinedOrganizations: pageData.joinedOrganizations,
        joinedPagination: pageData.joinedPagination,
        availableOrganizations: pageData.availableOrganizations,
        availablePagination: pageData.availablePagination,
        currentOrganizationId: resolveCurrentOrganizationId(ctx),
        filters: omitUndefined({
          tab,
          search,
        }),
      })
    )
  }
}
