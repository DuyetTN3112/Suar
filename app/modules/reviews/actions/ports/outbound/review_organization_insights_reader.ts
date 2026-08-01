import type { OrganizationReviewOverview } from '#modules/reviews/public_contracts/organization_review_insights'

export interface ReviewOrganizationInsightsReader {
  loadOrganizationReviewOverview(organizationId: string): Promise<OrganizationReviewOverview>

  listActiveDisputeRevieweeIds(memberUserIds: string[]): Promise<string[]>
}
