import { GetOrganizationDetailDTO } from '../../dtos/request/directory/get_organization_detail_dto.js'

import GetOrganizationDetailQuery from './get_organization_detail_query.js'

import type AppException from '#modules/errors/public_contracts/application_exception'
import { type Result } from '#modules/errors/public_contracts/result'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/directory/organization_external_dependencies'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'
import type { OrganizationPortfolioStatsReader } from '#modules/organizations/actions/ports/outbound/directory/organization_portfolio_stats_reader'
import type {
  OrganizationReverseReviewReader,
  OrganizationReviewOverview,
} from '#modules/organizations/actions/ports/outbound/directory/organization_reverse_review_reader'
import { BaseQuery } from '#modules/organizations/actions/queries/base_query'
import GetOrganizationShowDataQuery from '#modules/organizations/actions/queries/members/get_organization_show_data_query'
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

export interface OrganizationShowPageInput {
  organizationId: string
  userId: string
  input?: { page?: unknown; perPage?: unknown }
}

/**
 * Composite Query: Get Organization Show Page Data
 *
 * Aggregates all data needed to render the organization show page
 * by running GetOrganizationDetailQuery and GetOrganizationShowDataQuery in parallel.
 */
export default class GetOrganizationShowPageQuery extends BaseQuery<
  OrganizationShowPageInput,
  OrganizationShowPageResult
> {
  constructor(
    execCtx: OrganizationActionContext,
    private readonly portfolioStats: OrganizationPortfolioStatsReader,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly reverseReviews: OrganizationReverseReviewReader
  ) {
    super(execCtx)
  }

  override async handle(input: OrganizationShowPageInput): Promise<OrganizationShowPageResult> {
    return this.execute(input.organizationId, input.userId, input.input)
  }

  override async executeAndWrap(
    input: OrganizationShowPageInput
  ): Promise<Result<OrganizationShowPageResult, AppException>>
  override async executeAndWrap(
    organizationId: string,
    userId: string,
    input?: { page?: unknown; perPage?: unknown }
  ): Promise<Result<OrganizationShowPageResult, AppException>>
  override async executeAndWrap(
    organizationIdOrInput: string | OrganizationShowPageInput,
    userId?: string,
    input: { page?: unknown; perPage?: unknown } = {}
  ): Promise<Result<OrganizationShowPageResult, AppException>> {
    return super.executeAndWrap(
      typeof organizationIdOrInput === 'string'
        ? { organizationId: organizationIdOrInput, userId: userId as string, input }
        : organizationIdOrInput
    )
  }

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
