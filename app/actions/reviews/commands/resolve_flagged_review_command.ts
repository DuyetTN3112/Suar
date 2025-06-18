import { BaseCommand } from '#actions/shared/base_command'
import FlaggedReview from '#models/flagged_review'
import BusinessLogicException from '#exceptions/business_logic_exception'
import CacheService from '#services/cache_service'
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
  FlaggedReview
> {
  async handle(dto: ResolveFlaggedReviewDTO): Promise<FlaggedReview> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      const flaggedReview = await FlaggedReview.query({ client: trx })
        .where('id', dto.flagged_review_id)
        .forUpdate()
        .firstOrFail()

      if (flaggedReview.status !== 'pending') {
        throw new BusinessLogicException('This flagged review has already been resolved')
      }

      const validActions: string[] = ['dismissed', 'confirmed']
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

      await flaggedReview.useTransaction(trx).save()

      await this.logAudit('resolve_flagged_review', 'flagged_review', flaggedReview.id, null, {
        action: dto.action,
        notes: dto.notes,
      })

      await CacheService.deleteByPattern('flagged:*')

      return flaggedReview
    })
  }
}
