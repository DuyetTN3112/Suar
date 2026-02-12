import { GetOrganizationDetailDTO } from '../dtos/request/get_organization_detail_dto.js'

import GetOrganizationDetailQuery from './get_organization_detail_query.js'

import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationUserReaderWriter } from '#modules/organizations/directory/actions/ports/outbound/organization_external_dependencies'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/directory/actions/ports/outbound/organization_persistence'
import type { OrganizationPortfolioStatsReader } from '#modules/organizations/directory/actions/ports/outbound/organization_portfolio_stats_reader'
import type {
  OrganizationReverseReviewReader,
  OrganizationReviewOverview,
} from '#modules/organizations/directory/actions/ports/outbound/organization_reverse_review_reader'
import GetOrganizationShowDataQuery from '#modules/organizations/members/actions/query/get_organization_show_data_query'
import type { CanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

export interface OrganizationShowPageResult {
  organization: Awaited<ReturnType<GetOrganizationDetailQuery['execute']>>
  members: {
    id: string
    username: string
    email: string
    org_role: string
    role_name: string
  }[]
  membersPagination: CanonicalPagePagination
  userRole: string
  organizationReviews: OrganizationReviewOverview['organizationReviews']
  reverseReviewGovernance: OrganizationReviewOverview['reverseReviewGovernance']
}

/**
 * Composite Query: Get Organization Show Page Data
 *
 * Aggregates all data needed to render the organization show page
 * by running GetOrganizationDetailQuery and GetOrganizationShowDataQuery in parallel.
 */
export default class GetOrganizationShowPageQuery {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly portfolioStats: OrganizationPortfolioStatsReader,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly reverseReviews: OrganizationReverseReviewReader
  ) {}

  async execute(
    organizationId: string,
    userId: string,
    input: { page?: unknown; perPage?: unknown } = {}
  ): Promise<OrganizationShowPageResult> {
    const dto = new GetOrganizationDetailDTO(organizationId, true, false, false)

    const [organization, showData, reviewOverview] = await Promise.all([
      new GetOrganizationDetailQuery(
        this.execCtx,
        this.portfolioStats,
        this.userReaderWriter,
        this.organizations,
        this.memberships
      ).execute(dto),
      new GetOrganizationShowDataQuery(this.memberships).execute(
        organizationId,
        userId,
        input
      ),
      this.reverseReviews.loadOrganizationReviewOverview(organizationId),
    ])

    return {
      organization,
      members: showData.members,
      membersPagination: toCanonicalPagePagination(showData.membersMeta),
      userRole: showData.userRole,
      organizationReviews: reviewOverview.organizationReviews,
      reverseReviewGovernance: reviewOverview.reverseReviewGovernance,
    }
  }
}
