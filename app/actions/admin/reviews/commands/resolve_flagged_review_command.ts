import { Exception } from '@adonisjs/core/exceptions'

import { BaseCommand } from '#actions/admin/base_command'
import { AdminFlaggedReviewReadOps } from '#infra/admin/repositories/read/admin_flagged_review_queries'
import { AdminFlaggedReviewWriteOps } from '#infra/admin/repositories/write/admin_flagged_review_mutations'
import type { ExecutionContext } from '#types/execution_context'

export interface ResolveFlaggedReviewDTO {
  flaggedReviewId: string
  action: 'dismiss' | 'confirm'
  notes?: string
}

export default class ResolveFlaggedReviewCommand extends BaseCommand<ResolveFlaggedReviewDTO> {
  constructor(
    execCtx: ExecutionContext,
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
