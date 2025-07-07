/**
 * ReviewApplicationMapper — Application Layer Mapper
 *
 * Maps domain entities to response DTOs for the API layer.
 */

import type {
  ReviewSessionResponseDTO,
  SkillReviewResponseDTO,
  ReviewSummaryResponseDTO,
} from '../dtos/response/review_response_dtos.js'

import type { ReviewSessionEntity } from '#domain/reviews/entities/review_session_entity'
import type { SkillReviewEntity } from '#domain/reviews/entities/skill_review_entity'

export class ReviewApplicationMapper {
  private readonly __instanceMarker = true

  static {
    void new ReviewApplicationMapper().__instanceMarker
  }

  static toSessionResponse(entity: ReviewSessionEntity): ReviewSessionResponseDTO {
    return {
      id: entity.id,
      taskAssignmentId: entity.taskAssignmentId,
      revieweeId: entity.revieweeId,
      status: entity.status,
      managerReviewCompleted: entity.managerReviewCompleted,
      peerReviewsCount: entity.peerReviewsCount,
      requiredPeerReviews: entity.requiredPeerReviews,
      peerReviewProgress: entity.peerReviewProgress,
      confirmations: entity.confirmations,
      deadline: entity.deadline?.toISOString() ?? null,
      completedAt: entity.completedAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }

  static toSkillReviewResponse(entity: SkillReviewEntity): SkillReviewResponseDTO {
    return {
      id: entity.id,
      reviewSessionId: entity.reviewSessionId,
      reviewerId: entity.reviewerId,
      reviewerType: entity.reviewerType,
      skillId: entity.skillId,
      assignedLevelCode: entity.assignedLevelCode,
      comment: entity.comment,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }

  static toSummaryResponse(
    session: ReviewSessionEntity,
    skillReviews: SkillReviewEntity[]
  ): ReviewSummaryResponseDTO {
    return {
      session: this.toSessionResponse(session),
      skillReviews: skillReviews.map((sr) => this.toSkillReviewResponse(sr)),
      totalSkillReviews: skillReviews.length,
    }
  }
}
