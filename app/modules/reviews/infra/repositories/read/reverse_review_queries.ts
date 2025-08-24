import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ReverseReview from '#modules/reviews/infra/models/reverse_review'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? ReverseReview.query({ client: trx }) : ReverseReview.query()
}

export const findByUniqueScope = (
  reviewSessionId: string,
  reviewerId: string,
  targetType: string,
  targetId: string,
  trx?: TransactionClientContract
): Promise<ReverseReview | null> => {
  return baseQuery(trx)
    .where('review_session_id', reviewSessionId)
    .where('reviewer_id', reviewerId)
    .where('target_type', targetType)
    .where('target_id', targetId)
    .first()
}
