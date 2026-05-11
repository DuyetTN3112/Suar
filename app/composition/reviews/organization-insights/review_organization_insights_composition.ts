import GetActiveReviewDisputeMemberIdsQuery from '#modules/reviews/actions/queries/disputes/get_active_review_dispute_member_ids_query'
import GetOrganizationReviewOverviewQuery from '#modules/reviews/actions/queries/review-core/get_organization_review_overview_query'
import ReviewOrganizationInsightsReader from '#modules/reviews/infra/adapters/review-core/review_organization_insights_reader'

export const reviewOrganizationInsightsReader = new ReviewOrganizationInsightsReader()

export const organizationReviewOverviewQuery = new GetOrganizationReviewOverviewQuery(
  reviewOrganizationInsightsReader
)

export const activeReviewDisputeMemberIdsQuery = new GetActiveReviewDisputeMemberIdsQuery(
  reviewOrganizationInsightsReader
)
