import db from '@adonisjs/lucid/services/db'

import { LucidReviewConfirmationDisputeSession } from './lucid_review_confirmation_dispute_session.js'

import type {
  ReviewConfirmationDisputePersistenceSession,
  ReviewConfirmationDisputeUnitOfWork,
} from '#modules/disputes/actions/ports/outbound/review_confirmation_dispute_unit_of_work'

export { LucidReviewConfirmationDisputeSession }

export default class LucidReviewConfirmationDisputeUnitOfWork implements ReviewConfirmationDisputeUnitOfWork {
  run<T>(work: (session: ReviewConfirmationDisputePersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction((transaction) =>
      work(new LucidReviewConfirmationDisputeSession(transaction))
    )
  }
}
