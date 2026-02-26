import type { ReviewOrganizationInsightsReader } from '../ports/outbound/review_organization_insights_reader.js'

import type { OrganizationReviewOverview } from '#modules/reviews/public_contracts/organization_review_insights'

export default class GetOrganizationReviewOverviewQuery {
  constructor(private readonly insights: ReviewOrganizationInsightsReader) {}

  execute(organizationId: string): Promise<OrganizationReviewOverview> {
    return this.insights.loadOrganizationReviewOverview(organizationId)
  }
}
