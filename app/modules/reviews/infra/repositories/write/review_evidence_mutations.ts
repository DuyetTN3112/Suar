import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ReviewEvidence from '#modules/reviews/infra/models/review_evidence'

export const create = (
  data: Partial<ReviewEvidence>,
  trx?: TransactionClientContract
): Promise<ReviewEvidence> => {
  return ReviewEvidence.create(data, trx ? { client: trx } : undefined)
}
