/**
 * IReviewRepository — Domain Repository Interface
 *
 * Defines the contract for review data access.
 * Implementation lives in infra layer.
 * Domain layer only depends on this interface, never on the implementation.
 */

import type { ReviewSessionEntity } from '../entities/review_session_entity.js'
import type { SkillReviewEntity } from '../entities/skill_review_entity.js'


export interface ReviewRepository {
  findSessionById(id: string): Promise<ReviewSessionEntity | null>
  findSessionsByReviewee(revieweeId: string): Promise<ReviewSessionEntity[]>
  findSkillReviewsBySession(sessionId: string): Promise<SkillReviewEntity[]>
  findPendingSessions(): Promise<ReviewSessionEntity[]>
}
