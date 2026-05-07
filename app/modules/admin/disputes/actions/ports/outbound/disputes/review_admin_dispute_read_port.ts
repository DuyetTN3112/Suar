import type {
  AdminReviewDisputeAiOperatorOverview,
  GetAdminReviewDisputeDetailInput,
  GetAdminReviewDisputeDetailResult,
  ListAdminReviewDisputesInput,
  ListAdminReviewDisputesResult,
  ReviewAdminDisputeExecutionContext,
} from '#modules/reviews/public_contracts/admin_review_dispute_capability'

export abstract class ReviewAdminDisputeReadPort {
  abstract list(
    input: ListAdminReviewDisputesInput,
    context: ReviewAdminDisputeExecutionContext
  ): Promise<ListAdminReviewDisputesResult>
  abstract getDetail(
    input: GetAdminReviewDisputeDetailInput,
    context: ReviewAdminDisputeExecutionContext
  ): Promise<GetAdminReviewDisputeDetailResult>
  abstract getAiOperatorOverview(
    input: ListAdminReviewDisputesInput,
    context: ReviewAdminDisputeExecutionContext
  ): Promise<AdminReviewDisputeAiOperatorOverview>
}
