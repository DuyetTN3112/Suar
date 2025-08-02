import { DateTime } from 'luxon'

import FlaggedReview from '#infra/reviews/models/flagged_review'
import type { DatabaseId } from '#types/database'

export const AdminFlaggedReviewWriteOps = {
  async resolve(
    id: string,
    action: 'dismiss' | 'confirm',
    reviewedBy: DatabaseId,
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
