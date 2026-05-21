import type { AdminActionContext } from '#modules/admin/disputes/actions/action_context'
import type { ReviewAdminDisputeReadPort } from '#modules/admin/disputes/actions/ports/outbound/disputes/review_admin_dispute_read_port'
import { BaseQuery } from '#modules/admin/disputes/actions/queries/disputes/base_query'
import type {
  AdminReviewDisputeAiOperatorOverview,
  ListAdminReviewDisputesInput,
} from '#modules/reviews/public_contracts/admin_review_dispute_capability'

/** Read model for the operational AI console. It never dispatches or retries work. */
export default class GetAiOperatorOverviewQuery extends BaseQuery<
  ListAdminReviewDisputesInput,
  AdminReviewDisputeAiOperatorOverview
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly disputes: ReviewAdminDisputeReadPort
  ) {
    super(execCtx)
  }

  handle(input: ListAdminReviewDisputesInput): Promise<AdminReviewDisputeAiOperatorOverview> {
    return this.disputes.getAiOperatorOverview(input, this.execCtx)
  }
}
