/**
 * IReviewRepository — Domain Repository Interface
 *
 * Defines the contract for review data access.
 * Implementation lives in infra layer.
 * Domain layer only depends on this interface, never on the implementation.
 */

import type { ReviewSessionEntity } from '../entities/review_session_entity.js'
import type { SkillReviewEntity } from '../entities/skill_review_entity.js'

import type { DatabaseId } from '#types/database'

export interface ReviewRepository {
  findSessionById(id: DatabaseId): Promise<ReviewSessionEntity | null>
  findSessionsByReviewee(revieweeId: DatabaseId): Promise<ReviewSessionEntity[]>
  findSkillReviewsBySession(sessionId: DatabaseId): Promise<SkillReviewEntity[]>
  findPendingSessions(): Promise<ReviewSessionEntity[]>
}
