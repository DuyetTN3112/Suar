import type { AdminActionContext } from '#modules/admin/disputes/actions/action_context'
import type { ReviewAdminDisputeReadPort } from '#modules/admin/disputes/actions/ports/outbound/disputes/review_admin_dispute_read_port'
import { BaseQuery } from '#modules/admin/disputes/actions/queries/disputes/base_query'
import type {
  GetAdminReviewDisputeDetailInput,
  GetAdminReviewDisputeDetailResult,
} from '#modules/reviews/public_contracts/admin_review_dispute_capability'

export default class GetAdminDisputeDetailQuery extends BaseQuery<
  GetAdminReviewDisputeDetailInput,
  GetAdminReviewDisputeDetailResult
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly disputes: ReviewAdminDisputeReadPort
  ) {
    super(execCtx)
  }

  handle(
    input: GetAdminReviewDisputeDetailInput
  ): Promise<GetAdminReviewDisputeDetailResult> {
    return this.disputes.getDetail(input, this.execCtx)
  }
}
