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

export const paginateBySession = async (
  reviewSessionId: string,
  options: { page: number; perPage: number },
  trx?: TransactionClientContract
): Promise<{
  data: ReviewEvidence[]
  meta: { total: number; per_page: number; current_page: number; last_page: number }
}> => {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      reviewSessionId
    )
  ) {
    return {
      data: [],
      meta: { total: 0, per_page: options.perPage, current_page: options.page, last_page: 1 },
    }
  }

  const result = await baseQuery(trx)
    .where('review_session_id', reviewSessionId)
    .orderBy('created_at', 'desc')
    .paginate(options.page, options.perPage)

  return {
    data: result.all(),
    meta: {
      total: result.total,
      per_page: result.perPage,
      current_page: result.currentPage,
      last_page: result.lastPage,
    },
  }
}
