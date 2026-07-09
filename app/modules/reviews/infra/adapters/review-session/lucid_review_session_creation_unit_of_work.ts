import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type {
  ReviewSessionCreationPersistenceSession,
  ReviewSessionCreationUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_session_creation_unit_of_work'
import {
  lockClassicReviewAssignmentGovernanceByAssignmentId,
  lockClassicReviewSessionGovernance,
} from '#modules/reviews/infra/adapters/review-core/lucid_classic_review_governance_lock'
import {
  createReviewerAssignmentsForSession,
  resolveEffectiveCreatorReviewerId,
} from '#modules/reviews/infra/adapters/review-session/lucid_review_session_reviewer_assignment_writer'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review-session/review_session_repository'

export default class LucidReviewSessionCreationUnitOfWork
  implements ReviewSessionCreationUnitOfWork
{
  run<T>(work: (session: ReviewSessionCreationPersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction(async (transaction) => {
      const session: ReviewSessionCreationPersistenceSession = {
        transaction,
        findByTaskAssignment: async (taskAssignmentId) => {
          await lockClassicReviewAssignmentGovernanceByAssignmentId(transaction, {
            assignmentId: taskAssignmentId,
            expectedAssignmentStatus: 'completed',
          })
          const existing = await ReviewSessionRepository.findByTaskAssignment(
            taskAssignmentId,
            transaction
          )
          if (!existing) return null
          await lockClassicReviewSessionGovernance(transaction, existing.id)
          return ReviewSessionRepository.findByTaskAssignment(taskAssignmentId, transaction)
        },
        resolveEffectiveCreatorReviewerId: (input) =>
          resolveEffectiveCreatorReviewerId(
            {
              task_assignment_id: input.taskAssignmentId,
              reviewee_id: input.revieweeId,
              creator_reviewer_id: input.creatorReviewerId,
            },
            transaction
          ),
        create: async (input) => {
          await lockClassicReviewAssignmentGovernanceByAssignmentId(transaction, {
            assignmentId: input.taskAssignmentId,
            expectedAssigneeId: input.revieweeId,
            expectedAssignmentStatus: 'completed',
          })
          return ReviewSessionRepository.create(
            {
              task_assignment_id: input.taskAssignmentId,
              reviewee_id: input.revieweeId,
              status: 'pending',
              manager_review_completed: false,
              creator_reviewer_id: input.creatorReviewerId,
              creator_review_completed: false,
              manager_reviews_count: 0,
              peer_reviews_count: 0,
              required_peer_reviews: input.requiredPeerReviews,
              required_total_reviews: input.requiredTotalReviews,
              minimum_manager_reviews: input.minimumManagerReviews,
              minimum_peer_reviews: input.minimumPeerReviews,
              deadline: DateTime.fromJSDate(input.deadline),
            },
            transaction
          )
        },
        createReviewerAssignments: (reviewSession) =>
          createReviewerAssignmentsForSession(
            {
              id: reviewSession.id,
              task_assignment_id: reviewSession.task_assignment_id,
              reviewee_id: reviewSession.reviewee_id,
              creator_reviewer_id: reviewSession.creator_reviewer_id,
              deadline: reviewSession.deadline?.toISO() ?? null,
              minimum_manager_reviews: reviewSession.minimum_manager_reviews,
              minimum_peer_reviews: reviewSession.minimum_peer_reviews,
              required_peer_reviews: reviewSession.required_peer_reviews,
            },
            transaction
          ),
        writeCreatedAudit: async (execCtx, sessionId, input) => {
          if (!execCtx.userId) return
          await auditPublicApi.write(
            execCtx,
            {
              user_id: execCtx.userId,
              action: 'create',
              critical: true,
              entity_type: 'review_session',
              entity_id: sessionId,
              old_values: null,
              new_values: {
                task_assignment_id: input.taskAssignmentId,
                reviewee_id: input.revieweeId,
              },
            },
            transaction
          )
        },
      }
      return work(session)
    })
  }
}
