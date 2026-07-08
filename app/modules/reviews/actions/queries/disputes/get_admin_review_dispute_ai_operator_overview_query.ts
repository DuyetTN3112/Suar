import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { AiDisputeEvaluationSourceReader } from '#modules/reviews/actions/ports/outbound/ai_dispute_evaluation_source_reader'
import type { ReviewAdminDisputeReadModel } from '#modules/reviews/actions/ports/outbound/review_admin_dispute_read_model'
import ListAdminReviewDisputesQuery from '#modules/reviews/actions/queries/disputes/list_admin_review_disputes_query'
import type {
  AdminReviewDisputeAiOperatorOverview,
  ListAdminReviewDisputesInput,
  ReviewAdminDisputeExecutionContext,
} from '#modules/reviews/public_contracts/admin_review_dispute_capability'

export default class GetAdminReviewDisputeAiOperatorOverviewQuery extends BaseQuery<
  ListAdminReviewDisputesInput,
  AdminReviewDisputeAiOperatorOverview
> {
  constructor(
    context: ReviewAdminDisputeExecutionContext,
    private readonly sources: AiDisputeEvaluationSourceReader,
    private readonly adminDisputes: ReviewAdminDisputeReadModel
  ) {
    super(context)
  }

  async execute(
    input: ListAdminReviewDisputesInput
  ): Promise<AdminReviewDisputeAiOperatorOverview> {
    return this.handle(input)
  }

  async handle(
    input: ListAdminReviewDisputesInput
  ): Promise<AdminReviewDisputeAiOperatorOverview> {
    const [disputes, metrics] = await Promise.all([
      new ListAdminReviewDisputesQuery(this.execCtx, this.adminDisputes).execute(input),
      this.sources.loadOperatorMetrics(),
    ])

    return {
      disputes,
      metrics: {
        ...metrics,
        queuedDisputes: disputes.data.filter(
          (dispute) =>
            dispute.status === 'admin_reviewing' ||
            dispute.status === 'ai_reviewing' ||
            dispute.ai_evaluations_count > 0
        ).length,
      },
    }
  }
}
