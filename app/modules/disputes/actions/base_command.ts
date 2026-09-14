import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import type { ReviewTransaction, ReviewTransactionRunner } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

/**
 * Base Command for Disputes & AI Arbitration Bounded Context.
 */
export abstract class BaseCommand<TInput extends object, TOutput = void> {
  protected execCtx: ReviewActionContext

  constructor(
    execCtx: ReviewActionContext,
    protected readonly transactionRunner?: ReviewTransactionRunner
  ) {
    this.execCtx = execCtx
  }

  abstract handle(input: TInput): Promise<TOutput>

  protected async executeInTransaction<T>(
    callback: (trx: ReviewTransaction) => Promise<T>
  ): Promise<T> {
    if (!this.transactionRunner) {
      throw new InvariantViolationException('Transaction runner is required for executeInTransaction')
    }
    return await this.transactionRunner.run(callback)
  }

  protected async settlePostCommitEffect(
    effectName: string,
    effect: () => Promise<void>,
    context: {
      entityId: string
      actorId: string
    }
  ): Promise<void> {
    try {
      await effect()
    } catch (error) {
      loggerService.warn('Post-commit effect failed in disputes command', {
        effectName,
        entityId: context.entityId,
        actorId: context.actorId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
