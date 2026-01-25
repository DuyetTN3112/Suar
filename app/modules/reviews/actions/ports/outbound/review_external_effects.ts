import type { TalentExplainabilityProjectionChangedV1 } from '#modules/reviews/public_contracts/talent_explainability_projection_v1'
import type { SkillScoreUpdatedEvent } from '#modules/skills/public_contracts/skill_events'

/**
 * Post-commit effects emitted by Reviews application workflows.
 *
 * Commands decide when an effect is safe to publish; infrastructure decides
 * how it reaches the event bus or cache backend.
 */
export interface ReviewExternalEffectPublisher {
  emitSkillScoreUpdated(event: SkillScoreUpdatedEvent): Promise<void>
  invalidateUserProfileReviewData(revieweeId: string): Promise<void>
  publishTalentProjection(event: TalentExplainabilityProjectionChangedV1): Promise<void>
}
