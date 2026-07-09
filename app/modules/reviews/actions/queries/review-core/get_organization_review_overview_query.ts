import type { ReviewOrganizationInsightsReader } from '../../ports/outbound/review_organization_insights_reader.js'

import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { OrganizationReviewOverview } from '#modules/reviews/public_contracts/organization_review_insights'

export interface GetOrganizationReviewOverviewInput {
  organizationId: string
}

export default class GetOrganizationReviewOverviewQuery extends BaseQuery<
  GetOrganizationReviewOverviewInput,
  OrganizationReviewOverview
> {
  constructor(private readonly insights: ReviewOrganizationInsightsReader) {
    super()
  }

  execute(organizationId: string): Promise<OrganizationReviewOverview> {
    return this.handle({ organizationId })
  }

  handle(input: GetOrganizationReviewOverviewInput): Promise<OrganizationReviewOverview> {
    return this.insights.loadOrganizationReviewOverview(input.organizationId)
  }
}
