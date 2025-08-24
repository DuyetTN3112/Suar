/**
 * ReviewRepositoryImpl — Infrastructure Repository Implementation
 *
 * Implements IReviewRepository from domain layer.
 * Uses Lucid ORM (AdonisJS) for database access.
 * Maps ORM entities to domain entities using ReviewInfraMapper.
 */

import { ReviewInfraMapper } from '../mapper/review_infra_mapper.js'

import type { ReviewSessionEntity } from '#modules/reviews/domain/entities/review_session_entity'
import type { SkillReviewEntity } from '#modules/reviews/domain/entities/skill_review_entity'
import type { ReviewRepository } from '#modules/reviews/domain/repositories/review_repository_interface'
import ReviewSession from '#modules/reviews/infra/models/review_session'
import SkillReview from '#modules/reviews/infra/models/skill_review'

export class ReviewRepositoryImpl implements ReviewRepository {
  async findSessionById(id: string): Promise<ReviewSessionEntity | null> {
    const model = await ReviewSession.find(id)
    return model ? ReviewInfraMapper.toSessionDomain(model) : null
  }

  async findSessionsByReviewee(revieweeId: string): Promise<ReviewSessionEntity[]> {
    const models = await ReviewSession.query()
      .where('reviewee_id', revieweeId)
      .orderBy('created_at', 'desc')
    return models.map((m) => ReviewInfraMapper.toSessionDomain(m))
  }

  async findSkillReviewsBySession(sessionId: string): Promise<SkillReviewEntity[]> {
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
