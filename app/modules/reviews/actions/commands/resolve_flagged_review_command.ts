import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import RecalculateRevieweeSkillScoresCommand from '#modules/reviews/actions/commands/recalculate_reviewee_skill_scores_command'
import FlaggedReviewRepository from '#modules/reviews/infra/repositories/flagged_review_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { FlaggedReviewRecord } from '#modules/reviews/types/review_records'

/**
 * ResolveFlaggedReviewDTO
 */
export interface ResolveFlaggedReviewDTO {
  flagged_review_id: string
  action: 'dismissed' | 'confirmed'
  notes: string | null
}

/**
 * ResolveFlaggedReviewCommand
 *
 * Admin resolves a flagged review (dismiss or confirm the anomaly).
 * Khi confirm fraud:
 *   - Đánh dấu skill_review là fraud
 *   - Recalculate reviewee skill scores (loại bỏ review fraud)
 *   - Recalculate reviewer credibility
 *   - Audit log đầy đủ
 */
export default class ResolveFlaggedReviewCommand extends BaseCommand<
  ResolveFlaggedReviewDTO,
  FlaggedReviewRecord
> {
  async handle(dto: ResolveFlaggedReviewDTO): Promise<FlaggedReviewRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      const flaggedReview = await FlaggedReviewRepository.findByIdForUpdate(
        dto.flagged_review_id,
        trx
      )

      if (!flaggedReview) {
        throw new BusinessLogicException('Flagged review không tồn tại')
      }

      if (flaggedReview.status !== 'pending') {
        throw new BusinessLogicException('This flagged review has already been resolved')
      }

      const validActions: ResolveFlaggedReviewDTO['action'][] = ['dismissed', 'confirmed']
      if (!validActions.includes(dto.action)) {
        throw new BusinessLogicException('Action must be "dismissed" or "confirmed')
      }

      flaggedReview.status = dto.action
      flaggedReview.reviewed_by = userId
      const luxonModule = await import('luxon')
      flaggedReview.reviewed_at = luxonModule.DateTime.now()
      if (dto.notes) {
        flaggedReview.notes = dto.notes
      }

      await FlaggedReviewRepository.save(flaggedReview, trx)

      // ── Fraud confirmed: rollback skill scores ────────────────────────
      if (dto.action === 'confirmed') {
        await this.rollbackFraudulentReview(flaggedReview.skill_review_id, trx)
      }

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'resolve_flagged_review',
          entity_type: 'flagged_review',
          entity_id: flaggedReview.id,
          old_values: null,
          new_values: {
            action: dto.action,
            notes: dto.notes,
          },
        })
      }

      return {
        flaggedReview,
        cachePattern: 'flagged:*',
      }
    })

    await cacheStore.deleteByPattern(result.cachePattern)
    return result.flaggedReview
  }

  /**
   * Rollback fraudulent review:
   * 1. Đánh dấu skill_review là fraud
   * 2. Recalculate reviewee skill scores
   */
  private async rollbackFraudulentReview(
    skillReviewId: string,
    trx: import('@adonisjs/lucid/types/database').TransactionClientContract
  ): Promise<void> {
    // 1. Load skill review
    const skillReview = await SkillReviewRepository.findByIdForUpdate(skillReviewId, trx)
    if (!skillReview) {
      return
    }

    // 2. Đánh dấu skill review là fraud
    skillReview.is_fraud = true
    await SkillReviewRepository.save(skillReview, trx)

    // 3. Load review session để tìm reviewee
    const session = await ReviewSessionRepository.findById(skillReview.review_session_id, trx)
    if (!session) {
      return
    }

    // 4. Recalculate reviewee skill scores (sẽ exclude fraud reviews)
    const recalcCommand = new RecalculateRevieweeSkillScoresCommand(this.execCtx)
    await recalcCommand.handle({ userId: session.reviewee_id })
  }
}
