import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import FlaggedReview from '#infra/reviews/models/flagged_review'
import type { DatabaseId } from '#types/database'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? FlaggedReview.query({ client: trx }) : FlaggedReview.query()
}

export const findByIdForUpdate = (
  flaggedReviewId: DatabaseId,
  trx: TransactionClientContract
): Promise<FlaggedReview | null> => {
  return baseQuery(trx).where('id', flaggedReviewId).forUpdate().first()
}

export const create = (
  data: Partial<FlaggedReview>,
  trx?: TransactionClientContract
): Promise<FlaggedReview> => {
  return FlaggedReview.create(data, trx ? { client: trx } : undefined)
}

export const save = async (
  flaggedReview: FlaggedReview,
  trx?: TransactionClientContract
): Promise<FlaggedReview> => {
  if (trx) {
    flaggedReview.useTransaction(trx)
  }
  await flaggedReview.save()
  return flaggedReview
}
