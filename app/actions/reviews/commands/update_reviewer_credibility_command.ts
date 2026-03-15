import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import User from '#models/user'
import SkillReviewRepository from '#repositories/skill_review_repository'
import type { DatabaseId } from '#types/database'
import { calculateCredibilityScore } from '#domain/reviews/review_formulas'

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
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: UpdateReviewerCredibilityDTO): Promise<{
    credibility_score: number
    total_reviews: number
  }> {
    return await this.executeInTransaction(async (trx: TransactionClientContract) => {
      // ── FETCH ──────────────────────────────────────────────────────────
      const [totalReviews, confirmed, disputed] = await Promise.all([
        SkillReviewRepository.countCompletedByReviewer(dto.user_id, trx),
        SkillReviewRepository.countConfirmedByReviewer(dto.user_id, trx),
        SkillReviewRepository.countDisputedByReviewer(dto.user_id, trx),
      ])

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      const score = calculateCredibilityScore(totalReviews, confirmed, disputed)

      // ── PERSIST ────────────────────────────────────────────────────────
      const user = await User.query({ client: trx }).where('id', dto.user_id).firstOrFail()
      user.credibility_data = {
        credibility_score: score,
        total_reviews_given: totalReviews,
        accurate_reviews: confirmed,
        disputed_reviews: disputed,
        last_calculated_at: DateTime.now().toISO(),
      }
      await user.useTransaction(trx).save()

      return {
        credibility_score: score,
        total_reviews: totalReviews,
      }
    })
  }
}
