import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as flaggedReviewQueries from '../read/flagged_review_queries.js'


/**
 * FlaggedReviewRepository
 *
 * Data access for flagged reviews.
 */
export default class FlaggedReviewRepository {
  private readonly __instanceMarker = true

  static {
    void new FlaggedReviewRepository().__instanceMarker
  }

  static async paginateWithRelations(
    page: number,
    perPage: number,
    status?: string,
    trx?: TransactionClientContract
  ) {
    return flaggedReviewQueries.paginateWithRelations(page, perPage, status, trx)
  }

}
