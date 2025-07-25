import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ReviewEvidence from '#infra/reviews/models/review_evidence'
import type { DatabaseId } from '#types/database'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? ReviewEvidence.query({ client: trx }) : ReviewEvidence.query()
}

export const listBySession = (
  reviewSessionId: DatabaseId,
  trx?: TransactionClientContract
): Promise<ReviewEvidence[]> => {
  return baseQuery(trx).where('review_session_id', reviewSessionId).orderBy('created_at', 'desc')
}
