import { organizationReviewOverviewQuery } from '#composition/reviews/organization-insights/review_organization_insights_composition'
import { OrganizationReverseReviewReader } from '#modules/organizations/actions/ports/outbound/directory/organization_reverse_review_reader'

export class OrganizationReverseReviewReaderAdapter extends OrganizationReverseReviewReader {
  loadOrganizationReviewOverview(organizationId: string) {
    return organizationReviewOverviewQuery.execute(organizationId)
  }
}
