import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { TaskReviewFinalizedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'
import type { ReviewExternalDependencies } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewTransaction, ReviewTransactionRunner } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewUserWorkHistoryCacheInvalidator } from '#modules/reviews/actions/ports/outbound/review_user_work_history_cache_invalidator'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'

interface DeliveryContext {
  signal?: AbortSignal
}

export interface TaskReviewFinalizationSourceReader {
  findFinalizedTaskReviewWorkflow(
    workflowId: string,
    transaction: ReviewTransaction
  ): Promise<{
    id: string
    status: string
    taskAssignmentId: string | null
    taskId: string
    revieweeId: string | null
    completedAt: Date | string | null
  } | null>
}

/**
 * Performs the projection-side gate after a durable finalization event. The
 * workflow is reread under the consumer transaction so a forged/stale event
 * cannot affect profile aggregates.
 */
export default class ProcessTaskReviewFinalizedEventCommand {
  constructor(
    private readonly dependencies: Pick<ReviewExternalDependencies, 'user'>,
    private readonly transactions: ReviewTransactionRunner,
    private readonly sources: TaskReviewFinalizationSourceReader,
    private readonly workHistoryCache: ReviewUserWorkHistoryCacheInvalidator
  ) {}

  async handle(
    event: TaskReviewFinalizedOutboxPayload,
    context: DeliveryContext = {}
  ): Promise<void> {
    context.signal?.throwIfAborted()
    await this.transactions.run(async (transaction) => {
      const workflow = await this.sources.findFinalizedTaskReviewWorkflow(event.workflowId, transaction)
      if (
        !workflow ||
        workflow.status !== 'done' ||
        workflow.taskAssignmentId !== event.taskAssignmentId ||
        workflow.taskId !== event.taskId ||
        workflow.revieweeId !== event.revieweeId ||
        !workflow.completedAt
      ) {
        throw new InvariantViolationException(
          'Task review finalized event does not match an authoritative done workflow'
        )
      }

      context.signal?.throwIfAborted()
      await this.dependencies.user.refreshProfileAggregates(
        event.revieweeId,
        makeSystemReviewActionContext(event.finalizedBy),
        {
          trx: transaction,
          ...(context.signal ? { signal: context.signal } : {}),
        }
      )
    })
    context.signal?.throwIfAborted()
    await this.workHistoryCache.invalidateUserWorkHistory(event.revieweeId)
  }
}
