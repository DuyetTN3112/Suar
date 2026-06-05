import type { GetOrganizationsListDTO } from '../../dtos/request/directory/get_organizations_list_dto.js'

import { BaseQuery } from '../base_query.js'
import GetAllOrganizationsQuery from './get_all_organizations_query.js'
import GetOrganizationsListQuery from './get_organizations_list_query.js'

import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/directory/organization_external_dependencies'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'
import type { OrganizationPortfolioStatsReader } from '#modules/organizations/actions/ports/outbound/directory/organization_portfolio_stats_reader'
import {
  disabledOrganizationSearchCandidateReader,
  type OrganizationSearchCandidateReader,
} from '#modules/organizations/actions/ports/outbound/directory/organization_search_candidate_reader'

type OrganizationsListResult = Awaited<ReturnType<GetOrganizationsListQuery['execute']>>
type AvailableOrganizationsResult = Awaited<ReturnType<GetAllOrganizationsQuery['getWithMembershipStatusPage']>>

export interface OrganizationsIndexPageInput {
  joined: GetOrganizationsListDTO
  available: {
    userId: string
    page: number
    perPage: number
    search?: string
    plan?: string
    partnerType?: string
    partnerIsActive?: boolean
    createdAtStart?: string
    createdAtEnd?: string
  }
}

export interface OrganizationsIndexPageResult {
  joinedOrganizations: OrganizationsListResult['data']
  joinedPagination: OrganizationsListResult['pagination']
  availableOrganizations: AvailableOrganizationsResult['data']
  availablePagination: AvailableOrganizationsResult['meta']
}

/**
 * Query: Get Organizations Index Page Data
 *
 * Composite query that aggregates the organization list and the
 * enhanced organization directory used by the index page.
 */
export default class GetOrganizationsIndexPageQuery extends BaseQuery<
  OrganizationsIndexPageInput,
  OrganizationsIndexPageResult
> {
  constructor(
    protected override execCtx: OrganizationActionContext,
    private readonly portfolioStats: OrganizationPortfolioStatsReader,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly searchCandidates: OrganizationSearchCandidateReader =
      disabledOrganizationSearchCandidateReader
  ) {
    super(execCtx)
  }

  async handle(input: OrganizationsIndexPageInput): Promise<OrganizationsIndexPageResult> {
    return this.execute(input)
  }

  async execute(input: OrganizationsIndexPageInput): Promise<OrganizationsIndexPageResult> {
    const [organizationsResult, availableOrganizations] = await Promise.all([
      new GetOrganizationsListQuery(
        this.execCtx,
        this.portfolioStats,
        this.organizations,
        this.memberships
      ).execute(input.joined),
      new GetAllOrganizationsQuery(
        this.userReaderWriter,
        this.organizations,
        this.memberships,
        { searchCandidateReader: this.searchCandidates }
      ).getWithMembershipStatusPage(input.available),
    ])

    return {
      joinedOrganizations: organizationsResult.data,
      joinedPagination: organizationsResult.pagination,
      availableOrganizations: availableOrganizations.data,
      availablePagination: availableOrganizations.meta,
    }
  }
}
