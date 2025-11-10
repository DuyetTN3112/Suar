import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { ReviewSessionStatus } from '#modules/reviews/constants/review_constants'
import ReviewSession from '#modules/reviews/infra/models/review_session'
import { findByTaskAssignment } from '#modules/reviews/infra/repositories/read/review_session_queries'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? ReviewSession.query({ client: trx }) : ReviewSession.query()
}

export const findCompletedForRevieweeForUpdate = (
  sessionId: string,
  revieweeId: string,
  trx: TransactionClientContract
): Promise<ReviewSession | null> => {
  return baseQuery(trx)
    .where('id', sessionId)
    .where('reviewee_id', revieweeId)
    .where('status', ReviewSessionStatus.COMPLETED)
    .forUpdate()
    .first()
}

export const create = (
  data: Partial<ReviewSession>,
  trx?: TransactionClientContract
): Promise<ReviewSession> => {
  return ReviewSession.create(data, trx ? { client: trx } : undefined)
}

export const createForCompletedAssignmentIfMissing = async (
  input: {
    assignmentId: string
    assigneeId: string
  },
  trx?: TransactionClientContract
): Promise<boolean> => {
  const existingSession = await findByTaskAssignment(input.assignmentId, trx)
  if (existingSession) {
    return false
  }

  await create(
    {
      task_assignment_id: input.assignmentId,
      reviewee_id: input.assigneeId,
      status: ReviewSessionStatus.PENDING,
      manager_review_completed: false,
      peer_reviews_count: 0,
      required_peer_reviews: 2,
    },
    trx
  )

  return true
}

export const save = async (
  session: ReviewSession,
  trx?: TransactionClientContract
): Promise<ReviewSession> => {
  if (trx) {
    session.useTransaction(trx)
  }
  await session.save()
  return session
}
