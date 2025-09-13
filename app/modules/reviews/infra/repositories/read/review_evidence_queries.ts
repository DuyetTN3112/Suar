import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ReviewEvidence from '#modules/reviews/infra/models/review_evidence'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? ReviewEvidence.query({ client: trx }) : ReviewEvidence.query()
}

export const listBySession = (
  reviewSessionId: string,
  trx?: TransactionClientContract
): Promise<ReviewEvidence[]> => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reviewSessionId)) {
    return Promise.resolve([])
  }
  return baseQuery(trx).where('review_session_id', reviewSessionId).orderBy('created_at', 'desc')
}
