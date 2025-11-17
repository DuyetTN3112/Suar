import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ReverseReview from '#infra/reviews/models/reverse_review'
import type { DatabaseId } from '#types/database'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? ReverseReview.query({ client: trx }) : ReverseReview.query()
}

export const findByUniqueScope = (
  reviewSessionId: DatabaseId,
  reviewerId: DatabaseId,
  targetType: string,
  targetId: DatabaseId,
  trx?: TransactionClientContract
): Promise<ReverseReview | null> => {
  return baseQuery(trx)
    .where('review_session_id', reviewSessionId)
    .where('reviewer_id', reviewerId)
    .where('target_type', targetType)
    .where('target_id', targetId)
    .first()
}
