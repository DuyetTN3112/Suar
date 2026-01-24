import type {
  AiDisputeEvaluationGateway,
  AiDisputeReconciliationResult,
} from '../ports/outbound/ai_dispute_evaluation_gateway.js'

export default class ReconcileAiDisputeEvaluationsCommand {
  constructor(private readonly gateway: AiDisputeEvaluationGateway) {}

  execute(signal?: AbortSignal): Promise<AiDisputeReconciliationResult> {
    return this.gateway.reconcileOnce(signal)
  }
}
