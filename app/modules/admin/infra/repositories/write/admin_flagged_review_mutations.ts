import { DateTime } from 'luxon'

import FlaggedReview from '../../../../reviews/infra/models/flagged_review.js'

export const AdminFlaggedReviewWriteOps = {
  async resolve(
    id: string,
    action: 'dismiss' | 'confirm',
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    const flaggedReview = await FlaggedReview.findOrFail(id)
    flaggedReview.status = action === 'dismiss' ? 'dismissed' : 'confirmed'
    flaggedReview.reviewed_by = reviewedBy
    flaggedReview.notes = notes ?? null
    flaggedReview.reviewed_at = DateTime.now()
    await flaggedReview.save()
  },
}
