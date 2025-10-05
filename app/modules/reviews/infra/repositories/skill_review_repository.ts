import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  ReviewConfirmationAction,
  ReviewSessionStatus,
} from '#modules/reviews/constants/review_constants'
import SkillReview from '#modules/reviews/infra/models/skill_review'
import {
  getCanonicalProficiencyMidpointPercentage,
  isHighCanonicalProficiencyLevel,
} from '#modules/skills/public_contracts/proficiency_framework'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const getExtraNumber = (value: unknown, key: string): number => {
  if (!isRecord(value)) {
    return 0
  }
  const extras = value['$extras']
  if (!isRecord(extras)) {
    return 0
  }
  return toNumberValue(extras[key])
}

/**
 * SkillReviewRepository
 *
 * Data access for skill reviews.
 * Extracted from SkillReview model static methods.
 */
export default class SkillReviewRepository {
  // Keep one instance member so this is not a static-only utility class.
  isReady(): true {
    return true
  }

  static async countCompletedByReviewer(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? SkillReview.query({ client: trx }) : SkillReview.query()
    const result = await query
      .join('review_sessions', 'review_sessions.id', 'skill_reviews.review_session_id')
      .where('skill_reviews.reviewer_id', userId)
      .whereIn('review_sessions.status', [
        ReviewSessionStatus.COMPLETED,
        ReviewSessionStatus.DISPUTED,
      ])
      .countDistinct('skill_reviews.review_session_id as total')

    return getExtraNumber(result[0], 'total')
  }

  static async countConfirmedByReviewer(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<number> {
    const dbModule = await import('@adonisjs/lucid/services/db')
    const db = dbModule.default
    const baseDb = trx ?? db

    const result = (await baseDb
      .from('skill_reviews as sr')
      .join('review_sessions as rs', 'rs.id', 'sr.review_session_id')
      .where('sr.reviewer_id', userId)
      .where('rs.status', ReviewSessionStatus.COMPLETED)
      .whereRaw(
        `EXISTS (SELECT 1 FROM jsonb_array_elements(rs.confirmations) AS c WHERE c->>'action' = '${ReviewConfirmationAction.CONFIRMED}')`
      )
      .countDistinct('sr.review_session_id as total')
      .first()) as unknown

    return isRecord(result) ? toNumberValue(result['total']) : 0
  }

  static async countDisputedByReviewer(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<number> {
    const dbModule = await import('@adonisjs/lucid/services/db')
    const db = dbModule.default
    const baseDb = trx ?? db

    const result = (await baseDb
      .from('skill_reviews as sr')
      .join('review_sessions as rs', 'rs.id', 'sr.review_session_id')
      .where('sr.reviewer_id', userId)
      .where('rs.status', ReviewSessionStatus.DISPUTED)
      .whereRaw(
        `EXISTS (SELECT 1 FROM jsonb_array_elements(rs.confirmations) AS c WHERE c->>'action' = '${ReviewConfirmationAction.DISPUTED}')`
      )
      .countDistinct('sr.review_session_id as total')
      .first()) as unknown

    return isRecord(result) ? toNumberValue(result['total']) : 0
  }

  /**
   * Calculate average proficiency percentage from skill reviews.
   * Maps assigned_public_proficiency_code to proficiency midpoint percentages.
   */
  static async calculateSkillAvgPercentage(
    userId: string,
    skillId: string,
    trx?: TransactionClientContract
  ): Promise<{ avgPercentage: number; totalReviews: number }> {
    const query = trx ? SkillReview.query({ client: trx }) : SkillReview.query()
    const reviews = await query
      .join('review_sessions', 'review_sessions.id', 'skill_reviews.review_session_id')
      .where('review_sessions.reviewee_id', userId)
      .where('skill_reviews.skill_id', skillId)
      .where('review_sessions.status', ReviewSessionStatus.COMPLETED)
      .select('skill_reviews.assigned_public_proficiency_code')

    if (reviews.length === 0) {
      return { avgPercentage: 0, totalReviews: 0 }
    }

    let sum = 0
    for (const review of reviews) {
      const assignedLevelCode = review.assigned_public_proficiency_code
      const extraAssignedLevelCode = isRecord(review.$extras)
        ? review.$extras['assigned_public_proficiency_code']
        : undefined
      const code =
        typeof assignedLevelCode === 'string'
          ? assignedLevelCode
          : typeof extraAssignedLevelCode === 'string'
            ? extraAssignedLevelCode
            : undefined
      if (code) {
        sum += getCanonicalProficiencyMidpointPercentage(code)
      }
    }

    return {
      avgPercentage: sum / reviews.length,
      totalReviews: reviews.length,
    }
  }

  static async findBySessionAndReviewer(
    reviewSessionId: string,
    reviewerId: string,
    trx?: TransactionClientContract
  ): Promise<SkillReview | null> {
    const query = trx ? SkillReview.query({ client: trx }) : SkillReview.query()
    return query
      .where('review_session_id', reviewSessionId)
      .where('reviewer_id', reviewerId)
      .first()
  }

  static async listBySessionAndReviewer(
    reviewSessionId: string,
    reviewerId: string,
    trx?: TransactionClientContract
  ): Promise<SkillReview[]> {
    const query = trx ? SkillReview.query({ client: trx }) : SkillReview.query()
    return query.where('review_session_id', reviewSessionId).where('reviewer_id', reviewerId)
  }

  static async listBySession(
    reviewSessionId: string,
    trx?: TransactionClientContract
  ): Promise<SkillReview[]> {
    const query = trx ? SkillReview.query({ client: trx }) : SkillReview.query()
    return query.where('review_session_id', reviewSessionId)
  }

  static async create(
    data: Partial<SkillReview>,
    trx?: TransactionClientContract
  ): Promise<SkillReview> {
    return SkillReview.create(data, trx ? { client: trx } : undefined)
  }

  static async createMany(
    rows: Partial<SkillReview>[],
    trx?: TransactionClientContract
  ): Promise<SkillReview[]> {
    const created: SkillReview[] = []
    for (const row of rows) {
      created.push(await this.create(row, trx))
    }
    return created
  }

  static async countCompletedHighReviewsBetweenUsers(
    reviewerId: string,
    revieweeId: string,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? SkillReview.query({ client: trx }) : SkillReview.query()
    const reviews = await query
      .join('review_sessions', 'review_sessions.id', 'skill_reviews.review_session_id')
      .where('skill_reviews.reviewer_id', reviewerId)
      .where('review_sessions.reviewee_id', revieweeId)
      .where('review_sessions.status', ReviewSessionStatus.COMPLETED)
      .select('skill_reviews.assigned_public_proficiency_code')

    return reviews.reduce((total, review) => {
      const assignedLevelCode =
        typeof review.assigned_public_proficiency_code === 'string'
          ? review.assigned_public_proficiency_code
          : isRecord(review.$extras)
            && typeof review.$extras['assigned_public_proficiency_code'] === 'string'
            ? review.$extras['assigned_public_proficiency_code']
            : null

      return total + (isHighCanonicalProficiencyLevel(assignedLevelCode) ? 1 : 0)
    }, 0)
  }

  static async findByIdForUpdate(
    id: string,
    trx?: TransactionClientContract
  ): Promise<import('#modules/reviews/infra/models/skill_review').default | null> {
    const query = trx
      ? SkillReview.query({ client: trx }).where('id', id).forUpdate()
      : SkillReview.query().where('id', id).forUpdate()
    return query.first()
  }

  static async save(
    skillReview: InstanceType<typeof SkillReview>,
    trx?: TransactionClientContract
  ): Promise<void> {
    if (trx) {
      skillReview.useTransaction(trx)
    }
    await skillReview.save()
  }
}
