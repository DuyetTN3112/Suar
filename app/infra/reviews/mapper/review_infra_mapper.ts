/**
 * ReviewInfraMapper — Infrastructure Layer Mapper
 *
 * Maps between ORM Entity (Lucid Model) ↔ Domain Entity.
 *
 * Flow:
 *   Read:  ORM Entity → Domain Entity
 *   Write: Domain Entity → ORM Entity (partial, for create/update)
 */

import type ReviewSession from '#infra/reviews/models/review_session'
import type SkillReview from '#infra/reviews/models/skill_review'
import { ReviewSessionEntity } from '#modules/reviews/domain/entities/review_session_entity'
import type { ReviewSessionEntityProps } from '#modules/reviews/domain/entities/review_session_entity'
import { SkillReviewEntity } from '#modules/reviews/domain/entities/skill_review_entity'
import type { SkillReviewEntityProps } from '#modules/reviews/domain/entities/skill_review_entity'

export class ReviewInfraMapper {
  private readonly __instanceMarker = true

  static {
    void new ReviewInfraMapper().__instanceMarker
  }

  /**
   * ORM ReviewSession → Domain Entity
   */
  static toSessionDomain(model: ReviewSession): ReviewSessionEntity {
    const props: ReviewSessionEntityProps = {
      id: model.id,
      taskAssignmentId: model.task_assignment_id,
      revieweeId: model.reviewee_id,
      status: model.status,
      managerReviewCompleted: model.manager_review_completed,
      peerReviewsCount: model.peer_reviews_count,
      requiredPeerReviews: model.required_peer_reviews,
      confirmations: model.confirmations,
      deadline: model.deadline?.toJSDate() ?? null,
      completedAt: model.completed_at?.toJSDate() ?? null,
      createdAt: model.created_at.toJSDate(),
      updatedAt: model.updated_at.toJSDate(),
    }
    return new ReviewSessionEntity(props)
  }

  /**
   * Domain ReviewSessionEntity → ORM fields (partial, for create/update)
   */
  static toSessionOrm(entity: Partial<ReviewSessionEntityProps>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    if (entity.taskAssignmentId !== undefined) result.task_assignment_id = entity.taskAssignmentId
    if (entity.revieweeId !== undefined) result.reviewee_id = entity.revieweeId
    if (entity.status !== undefined) result.status = entity.status
    if (entity.managerReviewCompleted !== undefined)
      result.manager_review_completed = entity.managerReviewCompleted
    if (entity.peerReviewsCount !== undefined) result.peer_reviews_count = entity.peerReviewsCount
    if (entity.requiredPeerReviews !== undefined)
      result.required_peer_reviews = entity.requiredPeerReviews
    if (entity.confirmations !== undefined) result.confirmations = entity.confirmations
    if (entity.deadline !== undefined) result.deadline = entity.deadline
    if (entity.completedAt !== undefined) result.completed_at = entity.completedAt

    return result
  }

  /**
   * ORM SkillReview → Domain Entity
   */
  static toSkillReviewDomain(model: SkillReview): SkillReviewEntity {
    const props: SkillReviewEntityProps = {
      id: model.id,
      reviewSessionId: model.review_session_id,
      reviewerId: model.reviewer_id,
      reviewerType: model.reviewer_type,
      skillId: model.skill_id,
      assignedLevelCode: model.assigned_level_code,
      comment: model.comment,
      createdAt: model.created_at.toJSDate(),
      updatedAt: model.updated_at.toJSDate(),
    }
    return new SkillReviewEntity(props)
  }

  /**
   * Domain SkillReviewEntity → ORM fields (partial, for create/update)
   */
  static toSkillReviewOrm(entity: Partial<SkillReviewEntityProps>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    if (entity.reviewSessionId !== undefined) result.review_session_id = entity.reviewSessionId
    if (entity.reviewerId !== undefined) result.reviewer_id = entity.reviewerId
    if (entity.reviewerType !== undefined) result.reviewer_type = entity.reviewerType
    if (entity.skillId !== undefined) result.skill_id = entity.skillId
    if (entity.assignedLevelCode !== undefined)
      result.assigned_level_code = entity.assignedLevelCode
    if (entity.comment !== undefined) result.comment = entity.comment

    return result
  }
}
