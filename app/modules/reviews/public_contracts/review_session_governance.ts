import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { loadReviewSessionActorAccessContext } from '#modules/reviews/actions/support/review_session_actor_access'
import {
  createReviewerAssignmentsForSession,
  resolveEffectiveCreatorReviewerId,
  resolveReviewSessionDeadline,
} from '#modules/reviews/actions/support/review_session_reviewer_assignments'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'

export {
  createReviewerAssignmentsForSession,
  loadReviewSessionActorAccessContext,
  resolveEffectiveCreatorReviewerId,
  resolveReviewSessionDeadline,
}

export async function findReviewSessionByTaskAssignment(
  taskAssignmentId: string,
  trx?: TransactionClientContract
) {
  return ReviewSessionRepository.findByTaskAssignment(taskAssignmentId, trx)
}

export async function createReviewSession(
  data: Parameters<typeof ReviewSessionRepository.create>[0],
  trx?: TransactionClientContract
) {
  return ReviewSessionRepository.create(data, trx)
}
