import { organizationReviewOverviewQuery } from '#composition/review_organization_insights_composition'
import { OrganizationReverseReviewReader } from '#modules/organizations/directory/actions/ports/outbound/organization_reverse_review_reader'

export class OrganizationReverseReviewReaderAdapter extends OrganizationReverseReviewReader {
  loadOrganizationReviewOverview(organizationId: string) {
    return organizationReviewOverviewQuery.execute(organizationId)
  }
}
