import { ReviewAdminDisputeReadPort } from '#modules/admin/disputes/actions/ports/outbound/disputes/review_admin_dispute_read_port'
import type {
  AdminReviewDisputeAiOperatorOverview,
  GetAdminReviewDisputeDetailInput,
  GetAdminReviewDisputeDetailResult,
  ListAdminReviewDisputesInput,
  ListAdminReviewDisputesResult,
  ReviewAdminDisputeCapability,
  ReviewAdminDisputeExecutionContext,
} from '#modules/reviews/public_contracts/admin_review_dispute_capability'

export class ReviewsAdminDisputeReadAdapter extends ReviewAdminDisputeReadPort {
  constructor(private readonly reviews: ReviewAdminDisputeCapability) {
    super()
  }

  list(
    input: ListAdminReviewDisputesInput,
    context: ReviewAdminDisputeExecutionContext
  ): Promise<ListAdminReviewDisputesResult> {
    return this.reviews.list(input, context)
  }

  getDetail(
    input: GetAdminReviewDisputeDetailInput,
    context: ReviewAdminDisputeExecutionContext
  ): Promise<GetAdminReviewDisputeDetailResult> {
    return this.reviews.getDetail(input, context)
  }

  getAiOperatorOverview(
    input: ListAdminReviewDisputesInput,
    context: ReviewAdminDisputeExecutionContext
  ): Promise<AdminReviewDisputeAiOperatorOverview> {
    return this.reviews.getAiOperatorOverview(input, context)
  }
}
