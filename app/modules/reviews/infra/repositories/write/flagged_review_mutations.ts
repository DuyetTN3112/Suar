import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import FlaggedReview from '#modules/reviews/infra/models/review-core/flagged_review'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? FlaggedReview.query({ client: trx }) : FlaggedReview.query()
}

export const findByIdForUpdate = (
  flaggedReviewId: string,
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

export const createAnomalyIfMissing = async (
  data: {
    skill_review_id: string
    flag_type: string
    severity: string
    status: 'pending'
    notes: string
  },
  trx: TransactionClientContract
): Promise<FlaggedReview> => {
  const inserted = (await trx
    .table('flagged_reviews')
    .insert(data)
    .onConflict(['skill_review_id', 'flag_type'])
    .ignore()
    .returning('id')) as Array<{ id: string }>
  const id = inserted[0]?.id
  const flaggedReview = id
    ? await FlaggedReview.query({ client: trx }).where('id', id).first()
    : await FlaggedReview.query({ client: trx })
        .where('skill_review_id', data.skill_review_id)
        .where('flag_type', data.flag_type)
        .first()
  if (!flaggedReview) {
    throw new InvariantViolationException(
      'Anomaly flag conflict did not resolve to a durable row'
    )
  }
  return flaggedReview
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
