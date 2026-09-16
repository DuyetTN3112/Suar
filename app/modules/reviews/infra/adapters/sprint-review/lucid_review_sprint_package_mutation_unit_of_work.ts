import db from '@adonisjs/lucid/services/db'

import { LucidReviewSprintPackageMutationSession } from './lucid_review_sprint_package_mutation_session.js'

import {
  notificationFanoutPublicApi,
  type NotificationFanoutStagerContract,
} from '#modules/notifications/public_contracts/notification_fanout'
import type {
  ReviewSprintPackageMutationPersistenceSession,
  ReviewSprintPackageMutationUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_sprint_package_mutation_unit_of_work'

export { LucidReviewSprintPackageMutationSession }

/**
 * LucidReviewSprintPackageMutationUnitOfWork coordinates sprint package mutation transactions.
 * Underlying session manages:
 * - auditPublicApi.write
 * - notificationFanout.stage
 */
export default class LucidReviewSprintPackageMutationUnitOfWork implements ReviewSprintPackageMutationUnitOfWork {
  constructor(
    private readonly notificationFanout: NotificationFanoutStagerContract = notificationFanoutPublicApi
  ) {}

  run<T>(work: (session: ReviewSprintPackageMutationPersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction((transaction) =>
      work(new LucidReviewSprintPackageMutationSession(transaction, this.notificationFanout))
    )
  }
}
