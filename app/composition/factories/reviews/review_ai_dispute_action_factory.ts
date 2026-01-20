import ProcessAiDisputeCallbackCommand from '#modules/reviews/actions/commands/process_ai_dispute_callback_command'
import SaveAiDisputeFeedbackCommand from '#modules/reviews/actions/commands/save_ai_dispute_feedback_command'
import StartAiDisputeEvaluationCommand from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'
import type { AiDisputeEvaluationGateway } from '#modules/reviews/actions/ports/outbound/ai_dispute_evaluation_gateway'
import type { AiDisputeEvaluationSourceReader } from '#modules/reviews/actions/ports/outbound/ai_dispute_evaluation_source_reader'
import type { AiDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/ai_dispute_unit_of_work'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import ListAiDisputeEvaluationsQuery from '#modules/reviews/actions/queries/list_ai_dispute_evaluations_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ReviewAiDisputeActionFactoryDependencies {
  gateway?: AiDisputeEvaluationGateway
  runtime?: {
    callbackUrl: string
    dispatchImmediately: boolean
  }
  sources?: AiDisputeEvaluationSourceReader
  cryptography?: ReviewCryptography
  unitOfWork?: AiDisputeUnitOfWork
}

/**
 * Constructs AI-assisted dispute evaluation use cases.
 */
export class ReviewAiDisputeActionFactory {
  constructor(private readonly dependencies: ReviewAiDisputeActionFactoryDependencies) {}

  makeProcessAiDisputeCallbackCommand(): ProcessAiDisputeCallbackCommand {
    return new ProcessAiDisputeCallbackCommand(this.requireCryptography(), this.requireUnitOfWork())
  }

  makeSaveAiDisputeFeedbackCommand(execCtx: ReviewActionContext): SaveAiDisputeFeedbackCommand {
    return new SaveAiDisputeFeedbackCommand(execCtx, this.requireUnitOfWork())
  }

  makeStartAiDisputeEvaluationCommand(
    execCtx: ReviewActionContext
  ): StartAiDisputeEvaluationCommand {
    const runtime = this.requireEvaluationRuntime()
    return new StartAiDisputeEvaluationCommand(
      execCtx,
      runtime.gateway,
      runtime.runtime,
      runtime.sources
    )
  }

  makeListAiDisputeEvaluationsQuery(execCtx: ReviewActionContext): ListAiDisputeEvaluationsQuery {
    return new ListAiDisputeEvaluationsQuery(execCtx, this.requireSources())
  }

  private requireEvaluationRuntime(): {
    gateway: AiDisputeEvaluationGateway
    runtime: {
      callbackUrl: string
      dispatchImmediately: boolean
    }
    sources: AiDisputeEvaluationSourceReader
  } {
    if (!this.dependencies.gateway || !this.dependencies.runtime || !this.dependencies.sources) {
      throw new Error('AI dispute evaluation capability is not configured')
    }
    return {
      gateway: this.dependencies.gateway,
      runtime: this.dependencies.runtime,
      sources: this.dependencies.sources,
    }
  }

  private requireSources(): AiDisputeEvaluationSourceReader {
    if (!this.dependencies.sources) {
      throw new Error('AI dispute evaluation source capability is not configured')
    }
    return this.dependencies.sources
  }

  private requireCryptography(): ReviewCryptography {
    if (!this.dependencies.cryptography) {
      throw new Error('Review cryptography capability is not configured')
    }
    return this.dependencies.cryptography
  }

  private requireUnitOfWork(): AiDisputeUnitOfWork {
    if (!this.dependencies.unitOfWork) {
      throw new Error('AI dispute persistence capability is not configured')
    }
    return this.dependencies.unitOfWork
  }
}
