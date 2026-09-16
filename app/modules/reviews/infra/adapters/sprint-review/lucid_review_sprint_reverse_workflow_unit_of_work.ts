import db from '@adonisjs/lucid/services/db'

import { LucidReviewSprintReverseWorkflowSession } from './lucid_review_sprint_reverse_workflow_session.js'

import {
  notificationFanoutPublicApi,
  type NotificationFanoutStagerContract,
} from '#modules/notifications/public_contracts/notification_fanout'
import type {
  ReviewSprintReverseWorkflowPersistenceSession,
  ReviewSprintReverseWorkflowUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_sprint_reverse_workflow_unit_of_work'
import {
  aiDisputeAutoQueuePublicApi,
  type AiDisputeAutoQueueCapability,
} from '#modules/disputes/public_contracts/ai_dispute_auto_queue'

/**
 * LucidReviewSprintReverseWorkflowUnitOfWork coordinates reverse review workflow transactions.
 * Underlying session manages:
 * - notificationFanout.stage
 * - aiDisputeAutoQueue.stage
 */
export default class LucidReviewSprintReverseWorkflowUnitOfWork implements ReviewSprintReverseWorkflowUnitOfWork {
  constructor(
    private readonly notificationFanout: NotificationFanoutStagerContract = notificationFanoutPublicApi,
    private readonly aiDisputeAutoQueue: AiDisputeAutoQueueCapability = aiDisputeAutoQueuePublicApi
  ) {}

  run<T>(work: (session: ReviewSprintReverseWorkflowPersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction((transaction) =>
      work(
        new LucidReviewSprintReverseWorkflowSession(
          transaction,
          this.notificationFanout,
          this.aiDisputeAutoQueue
        )
      )
    )
  }
}
