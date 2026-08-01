import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  createReviewerAssignmentsForSession,
  resolveEffectiveCreatorReviewerId,
  resolveReviewSessionDeadline,
} from '#modules/reviews/infra/adapters/lucid_review_session_reviewer_assignment_writer'
import ReviewSession from '#modules/reviews/infra/models/review_session'
import { findByTaskAssignment } from '#modules/reviews/infra/repositories/read/review_session_queries'
import { REVIEW_DEFAULTS, ReviewSessionStatus } from '#modules/reviews/public_contracts/review_constants'

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
  const deadline = data.deadline ?? resolveReviewSessionDeadline()

  return ReviewSession.create(
    {
      ...data,
      deadline,
    },
    trx ? { client: trx } : undefined
  )
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

  const assignmentContext = trx ?? db
  const assignment = (await assignmentContext
    .from('task_assignments as ta')
    .join('tasks as t', 't.id', 'ta.task_id')
    .where('ta.id', input.assignmentId)
    .select('t.creator_id')
    .first()) as { creator_id?: string | null } | undefined

  const creatorReviewerId = await resolveEffectiveCreatorReviewerId(
    {
      task_assignment_id: input.assignmentId,
      reviewee_id: input.assigneeId,
      creator_reviewer_id: assignment?.creator_id ?? null,
    },
    trx
  )

  const session = await create(
    {
      task_assignment_id: input.assignmentId,
      reviewee_id: input.assigneeId,
      status: ReviewSessionStatus.PENDING,
      manager_review_completed: false,
      creator_reviewer_id: creatorReviewerId,
      creator_review_completed: false,
      manager_reviews_count: 0,
      peer_reviews_count: 0,
      required_peer_reviews: REVIEW_DEFAULTS.MIN_PEER_REVIEWS,
      required_total_reviews: REVIEW_DEFAULTS.MIN_TOTAL_REVIEWS,
      minimum_manager_reviews: REVIEW_DEFAULTS.MIN_MANAGER_REVIEWS,
      minimum_peer_reviews: REVIEW_DEFAULTS.MINIMUM_PEER_REVIEWS,
      deadline: resolveReviewSessionDeadline(),
    },
    trx
  )

  await createReviewerAssignmentsForSession(
    {
      id: session.id,
      task_assignment_id: session.task_assignment_id,
      reviewee_id: session.reviewee_id,
      creator_reviewer_id: session.creator_reviewer_id,
      deadline: session.deadline,
      minimum_manager_reviews: session.minimum_manager_reviews,
      minimum_peer_reviews: session.minimum_peer_reviews,
      required_peer_reviews: session.required_peer_reviews,
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
