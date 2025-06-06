/**
 * ReviewDomainMapper — Domain Layer Mapper
 *
 * Mapper thuần trong domain layer — KHÔNG import bất kỳ thứ gì từ
 * database, ORM hay framework.
 *
 * Chức năng:
 * - Tạo entity từ plain object (props)
 * - Export entity ra plain object
 *
 * Lưu ý: Việc map từ ORM Model → Domain Entity nằm ở INFRA layer,
 * KHÔNG phải ở đây.
 */

import { ReviewSessionEntity } from '../entities/review_session_entity.js'
import type { ReviewSessionEntityProps } from '../entities/review_session_entity.js'
import { SkillReviewEntity } from '../entities/skill_review_entity.js'
import type { SkillReviewEntityProps } from '../entities/skill_review_entity.js'

export class ReviewDomainMapper {
  /**
   * Plain object (props) → ReviewSessionEntity
   */
  static toSessionEntity(props: ReviewSessionEntityProps): ReviewSessionEntity {
    return new ReviewSessionEntity(props)
  }

  /**
   * ReviewSessionEntity → Plain object (props)
   */
  static toSessionProps(entity: ReviewSessionEntity): ReviewSessionEntityProps {
    return {
      id: entity.id,
      taskAssignmentId: entity.taskAssignmentId,
      revieweeId: entity.revieweeId,
      status: entity.status,
      managerReviewCompleted: entity.managerReviewCompleted,
      peerReviewsCount: entity.peerReviewsCount,
      requiredPeerReviews: entity.requiredPeerReviews,
      confirmations: entity.confirmations,
      deadline: entity.deadline,
      completedAt: entity.completedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }

  /**
   * Plain object (props) → SkillReviewEntity
   */
  static toSkillReviewEntity(props: SkillReviewEntityProps): SkillReviewEntity {
    return new SkillReviewEntity(props)
  }

  /**
   * SkillReviewEntity → Plain object (props)
   */
  static toSkillReviewProps(entity: SkillReviewEntity): SkillReviewEntityProps {
    return {
      id: entity.id,
      reviewSessionId: entity.reviewSessionId,
      reviewerId: entity.reviewerId,
      reviewerType: entity.reviewerType,
      skillId: entity.skillId,
      assignedLevelCode: entity.assignedLevelCode,
      comment: entity.comment,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }
}
