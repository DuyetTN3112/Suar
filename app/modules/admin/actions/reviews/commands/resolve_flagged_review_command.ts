import { Exception } from '@adonisjs/core/exceptions'

import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseCommand } from '#modules/admin/actions/base_command'
import { AdminFlaggedReviewReadOps } from '#modules/admin/infra/repositories/read/admin_flagged_review_queries'
import { AdminFlaggedReviewWriteOps } from '#modules/admin/infra/repositories/write/admin_flagged_review_mutations'

export interface ResolveFlaggedReviewDTO {
  flaggedReviewId: string
  action: 'dismiss' | 'confirm'
  notes?: string
}

export default class ResolveFlaggedReviewCommand extends BaseCommand<ResolveFlaggedReviewDTO> {
  constructor(
    execCtx: AdminActionContext,
    private readRepo = AdminFlaggedReviewReadOps,
    private writeRepo = AdminFlaggedReviewWriteOps
  ) {
    super(execCtx)
  }

  async handle(dto: ResolveFlaggedReviewDTO): Promise<void> {
    const reviewerId = this.getCurrentUserId()
    const flaggedReview = await this.readRepo.getFlaggedReviewDetail(dto.flaggedReviewId)
    if (!flaggedReview) {
      throw new Exception('Flagged review not found', { status: 404 })
    }

    if (flaggedReview.status !== 'pending') {
      throw new Exception('Flagged review already resolved', { status: 400 })
    }

    await this.writeRepo.resolve(dto.flaggedReviewId, dto.action, reviewerId, dto.notes)
  }
}
