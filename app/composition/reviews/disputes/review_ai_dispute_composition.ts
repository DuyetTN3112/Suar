import ReconcileAiDisputeEvaluationsCommand from '#modules/reviews/actions/commands/disputes/reconcile_ai_dispute_evaluations_command'
import { LucidAiDisputeEvaluationGateway } from '#modules/reviews/infra/adapters/disputes/lucid_ai_dispute_evaluation_gateway'

export const aiDisputeEvaluationGateway = LucidAiDisputeEvaluationGateway.fromEnvironment()

export const reconcileAiDisputeEvaluationsCommand = new ReconcileAiDisputeEvaluationsCommand(
  aiDisputeEvaluationGateway
)
