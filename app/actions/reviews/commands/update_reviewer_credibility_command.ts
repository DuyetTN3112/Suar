import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import { BaseCommand } from '#actions/reviews/base_command'
import { calculateCredibilityScore } from '#domain/reviews/review_formulas'
import SkillReviewRepository from '#infra/reviews/repositories/skill_review_repository'
import type { DatabaseId } from '#types/database'


/**
 * DTO for updating reviewer credibility
 */
export interface UpdateReviewerCredibilityDTO {
  user_id: DatabaseId
}

/**
 * Command: Update Reviewer Credibility
 *
 * v3: Credibility data stored as JSONB credibility_data on users table.
 *
 * Pattern: FETCH → DECIDE (pure formula) → PERSIST
 */
export default class UpdateReviewerCredibilityCommand extends BaseCommand<
  UpdateReviewerCredibilityDTO,
  { credibility_score: number; total_reviews: number }
> {
  async handle(dto: UpdateReviewerCredibilityDTO): Promise<{
    credibility_score: number
    total_reviews: number
  }> {
    return await this.executeInTransaction(async (trx: TransactionClientContract) => {
      // ── FETCH ──────────────────────────────────────────────────────────
      const totalReviews = await SkillReviewRepository.countCompletedByReviewer(dto.user_id, trx)
      const confirmed = await SkillReviewRepository.countConfirmedByReviewer(dto.user_id, trx)
      const disputed = await SkillReviewRepository.countDisputedByReviewer(dto.user_id, trx)

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      const score = calculateCredibilityScore(totalReviews, confirmed, disputed)

      // ── PERSIST ────────────────────────────────────────────────────────
      await DefaultReviewDependencies.user.updateCredibilityData(
        dto.user_id,
        {
          credibility_score: score,
          total_reviews_given: totalReviews,
          accurate_reviews: confirmed,
          disputed_reviews: disputed,
          last_calculated_at: DateTime.now().toISO(),
        },
        trx
      )

      return {
        credibility_score: score,
        total_reviews: totalReviews,
      }
    })
  }
}
