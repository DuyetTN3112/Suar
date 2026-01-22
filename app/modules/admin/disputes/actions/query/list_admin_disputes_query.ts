import type { AdminActionContext } from '#modules/admin/disputes/actions/action_context'
import type { ReviewAdminDisputeReadPort } from '#modules/admin/disputes/actions/ports/outbound/review_admin_dispute_read_port'
import { BaseQuery } from '#modules/admin/disputes/actions/query/base_query'
import type {
  ListAdminReviewDisputesInput,
  ListAdminReviewDisputesResult,
} from '#modules/reviews/public_contracts/admin_review_dispute_capability'

export default class ListAdminDisputesQuery extends BaseQuery<
  ListAdminReviewDisputesInput,
  ListAdminReviewDisputesResult
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly disputes: ReviewAdminDisputeReadPort
  ) {
    super(execCtx)
  }

  handle(input: ListAdminReviewDisputesInput): Promise<ListAdminReviewDisputesResult> {
    return this.disputes.list(input, this.execCtx)
  }
}
