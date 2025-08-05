import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ReverseReview from '#infra/reviews/models/reverse_review'

export const create = (
  data: Partial<ReverseReview>,
  trx?: TransactionClientContract
): Promise<ReverseReview> => {
  return ReverseReview.create(data, trx ? { client: trx } : undefined)
}
