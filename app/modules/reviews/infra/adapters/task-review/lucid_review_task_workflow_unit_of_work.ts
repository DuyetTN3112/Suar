import db from '@adonisjs/lucid/services/db'

import { LucidReviewTaskWorkflowSession } from './lucid_review_task_workflow_session.js'

import {
  notificationFanoutPublicApi,
  type NotificationFanoutStagerContract,
} from '#modules/notifications/public_contracts/notification_fanout'
import type {
  ReviewTaskWorkflowPersistenceSession,
  ReviewTaskWorkflowUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'
import {
  aiDisputeAutoQueuePublicApi,
  type AiDisputeAutoQueueCapability,
} from '#modules/disputes/public_contracts/ai_dispute_auto_queue'

export { LucidReviewTaskWorkflowSession }

/**
 * LucidReviewTaskWorkflowUnitOfWork coordinates review workflow transactions.
 * Persistence and side-effects are handled via LucidReviewTaskWorkflowSession:
 * - SQL persistence: transaction.from('task_review_workflows')
 * - Notifications: this.notificationFanout.stage(...)
 * - AI auto queue: this.aiDisputeAutoQueue.stage(...)
 */
export default class LucidReviewTaskWorkflowUnitOfWork implements ReviewTaskWorkflowUnitOfWork {
  constructor(
    private readonly notificationFanout: NotificationFanoutStagerContract = notificationFanoutPublicApi,
    private readonly aiDisputeAutoQueue: AiDisputeAutoQueueCapability = aiDisputeAutoQueuePublicApi
  ) {}

  run<T>(work: (session: ReviewTaskWorkflowPersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction((transaction) =>
      work(
        new LucidReviewTaskWorkflowSession(
          transaction,
          this.notificationFanout,
          this.aiDisputeAutoQueue
        )
      )
    )
  }

  runIn<T>(
    transaction: ReviewTransaction,
    work: (session: ReviewTaskWorkflowPersistenceSession) => Promise<T>
  ): Promise<T> {
    return work(
      new LucidReviewTaskWorkflowSession(
        toLucidReviewTransaction(transaction),
        this.notificationFanout,
        this.aiDisputeAutoQueue
      )
    )
  }
}
