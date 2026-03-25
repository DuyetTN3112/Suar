/**
 * ReviewRepositoryImpl — Infrastructure Repository Implementation
 *
 * Implements IReviewRepository from domain layer.
 * Uses Lucid ORM (AdonisJS) for database access.
 * Maps ORM entities to domain entities using ReviewInfraMapper.
 */

import type { ReviewRepository } from '#domain/reviews/repositories/review_repository_interface'
import type { ReviewSessionEntity } from '#domain/reviews/entities/review_session_entity'
import type { SkillReviewEntity } from '#domain/reviews/entities/skill_review_entity'
import { ReviewInfraMapper } from '../mapper/review_infra_mapper.js'
import ReviewSession from '#models/review_session'
import SkillReview from '#models/skill_review'
import type { DatabaseId } from '#types/database'

export class ReviewRepositoryImpl implements ReviewRepository {
  async findSessionById(id: DatabaseId): Promise<ReviewSessionEntity | null> {
    const model = await ReviewSession.find(id)
    return model ? ReviewInfraMapper.toSessionDomain(model) : null
  }

  async findSessionsByReviewee(revieweeId: DatabaseId): Promise<ReviewSessionEntity[]> {
    const models = await ReviewSession.query()
      .where('reviewee_id', revieweeId)
      .orderBy('created_at', 'desc')
    return models.map((m) => ReviewInfraMapper.toSessionDomain(m))
  }

  async findSkillReviewsBySession(sessionId: DatabaseId): Promise<SkillReviewEntity[]> {
    const models = await SkillReview.query()
      .where('review_session_id', sessionId)
      .orderBy('created_at', 'asc')
    return models.map((m) => ReviewInfraMapper.toSkillReviewDomain(m))
  }

  async findPendingSessions(): Promise<ReviewSessionEntity[]> {
    const models = await ReviewSession.query()
      .where('status', 'pending')
      .orderBy('created_at', 'asc')
    return models.map((m) => ReviewInfraMapper.toSessionDomain(m))
  }
}
