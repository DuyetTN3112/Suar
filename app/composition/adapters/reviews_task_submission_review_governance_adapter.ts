import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { loadReviewSessionActorAccessContext } from '#modules/reviews/infra/adapters/lucid_review_session_actor_access_reader'
import {
  createReviewerAssignmentsForSession,
  resolveEffectiveCreatorReviewerId,
  resolveReviewSessionDeadline,
} from '#modules/reviews/infra/adapters/lucid_review_session_reviewer_assignment_writer'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import { REVIEW_DEFAULTS } from '#modules/reviews/public_contracts/review_constants'
import {
  type TaskSubmissionReviewAudience,
  type TaskSubmissionReviewSessionInput,
  TaskSubmissionReviewGovernance,
} from '#modules/tasks/actions/ports/outbound/task_submission_review_governance'

export class ReviewsTaskSubmissionReviewGovernanceAdapter extends TaskSubmissionReviewGovernance {
  override async ensureSession(
    input: TaskSubmissionReviewSessionInput,
    trx: TransactionClientContract
  ): Promise<string> {
    let session = await ReviewSessionRepository.findByTaskAssignment(input.taskAssignmentId, trx)
    if (session) {
      return session.id
    }

    const creatorReviewerId = await resolveEffectiveCreatorReviewerId(
      {
        task_assignment_id: input.taskAssignmentId,
        reviewee_id: input.revieweeId,
        creator_reviewer_id: input.taskCreatorId,
      },
      trx
    )

    session = await ReviewSessionRepository.create(
      {
        task_assignment_id: input.taskAssignmentId,
        reviewee_id: input.revieweeId,
        status: 'pending',
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

    return session.id
  }

  override async loadNotificationAudience(
    reviewSessionId: string,
    actorUserId: string,
    trx: TransactionClientContract
  ): Promise<TaskSubmissionReviewAudience | null> {
    const access = await loadReviewSessionActorAccessContext(reviewSessionId, actorUserId, trx)
    if (!access) {
      return null
    }

    return {
      sessionRevieweeId: access.sessionRevieweeId,
      reviewerIds: Array.from(
        new Set([...access.managerReviewerIds, ...access.peerReviewerIds])
      ),
    }
  }
}
