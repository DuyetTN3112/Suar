import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import FlaggedReview from '#infra/reviews/models/flagged_review'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? FlaggedReview.query({ client: trx }) : FlaggedReview.query()
}

export const paginateWithRelations = (
  page: number,
  perPage: number,
  status?: string,
  trx?: TransactionClientContract
) => {
  const query = baseQuery(trx)
    .preload('skill_review', (srQuery) => {
      void srQuery
        .preload('reviewer', (uQuery) => {
          void uQuery.select(['id', 'username', 'email'])
        })
        .preload('review_session', (rsQuery) => {
          void rsQuery.preload('reviewee', (uQuery) => {
            void uQuery.select(['id', 'username', 'email'])
          })
        })
        .preload('skill', (sQuery) => {
          void sQuery.select(['id', 'name', 'category'])
        })
    })
    .preload('reviewer', (uQuery) => {
      void uQuery.select(['id', 'username', 'email'])
    })
    .orderBy('created_at', 'desc')

  if (status) {
    void query.where('status', status)
  }

  return query.paginate(page, perPage)
}
