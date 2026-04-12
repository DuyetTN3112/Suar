import { Exception } from '@adonisjs/core/exceptions'

import { BaseCommand } from '#actions/shared/base_command'
import AdminFlaggedReviewRepository from '#infra/admin/repositories/admin_flagged_review_repository'
import type { ExecutionContext } from '#types/execution_context'

export interface ResolveFlaggedReviewDTO {
  flaggedReviewId: string
  action: 'dismiss' | 'confirm'
  notes?: string
}

export default class ResolveFlaggedReviewCommand extends BaseCommand<ResolveFlaggedReviewDTO> {
  constructor(
    execCtx: ExecutionContext,
    private repo = new AdminFlaggedReviewRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: ResolveFlaggedReviewDTO): Promise<void> {
    const reviewerId = this.getCurrentUserId()
    const flaggedReview = await this.repo.findById(dto.flaggedReviewId)
    if (!flaggedReview) {
      throw new Exception('Flagged review not found', { status: 404 })
    }

    if (flaggedReview.status !== 'pending') {
      throw new Exception('Flagged review already resolved', { status: 400 })
    }

    await this.repo.resolve(dto.flaggedReviewId, dto.action, reviewerId, dto.notes)
  }
}
