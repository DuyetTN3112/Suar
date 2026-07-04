import type {
  AiDisputeEvaluationGateway,
  AiDisputeReconciliationResult,
} from '../../ports/outbound/ai_dispute_evaluation_gateway.js'

import { BaseCommand } from '#modules/reviews/actions/base_command'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ReconcileAiDisputeEvaluationsInput {
  readonly signal?: AbortSignal
}

export default class ReconcileAiDisputeEvaluationsCommand extends BaseCommand<
  ReconcileAiDisputeEvaluationsInput,
  AiDisputeReconciliationResult
> {
  constructor(private readonly gateway: AiDisputeEvaluationGateway) {
    super(makeSystemReviewActionContext('system'))
  }

  execute(signal?: AbortSignal): Promise<AiDisputeReconciliationResult> {
    return this.handle(signal ? { signal } : {})
  }

  override handle(
    input: ReconcileAiDisputeEvaluationsInput
  ): Promise<AiDisputeReconciliationResult> {
    return this.gateway.reconcileOnce(input.signal)
  }
}
