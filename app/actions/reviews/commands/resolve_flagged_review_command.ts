import { BaseCommand } from '#actions/shared/base_command'
import FlaggedReviewRepository from '#infra/reviews/repositories/flagged_review_repository'
import BusinessLogicException from '#exceptions/business_logic_exception'
import CacheService from '#infra/cache/cache_service'
import type { DatabaseId } from '#types/database'

/**
 * ResolveFlaggedReviewDTO
 */
export interface ResolveFlaggedReviewDTO {
  flagged_review_id: DatabaseId
  action: 'dismissed' | 'confirmed'
  notes: string | null
}

/**
 * ResolveFlaggedReviewCommand
 *
 * Admin resolves a flagged review (dismiss or confirm the anomaly).
 */
export default class ResolveFlaggedReviewCommand extends BaseCommand<
  ResolveFlaggedReviewDTO,
  import('#models/flagged_review').default
> {
  async handle(dto: ResolveFlaggedReviewDTO): Promise<import('#models/flagged_review').default> {
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
        throw new BusinessLogicException('Action must be "dismissed" or "confirmed"')
      }

      flaggedReview.status = dto.action
      flaggedReview.reviewed_by = userId
      const luxonModule = await import('luxon')
      flaggedReview.reviewed_at = luxonModule.DateTime.now()
      if (dto.notes) {
        flaggedReview.notes = dto.notes
      }

      await FlaggedReviewRepository.save(flaggedReview, trx)

      await this.logAudit('resolve_flagged_review', 'flagged_review', flaggedReview.id, null, {
        action: dto.action,
        notes: dto.notes,
      })

      return {
        flaggedReview,
        cachePattern: 'flagged:*',
      }
    })

    await CacheService.deleteByPattern(result.cachePattern)
    return result.flaggedReview
  }
}
