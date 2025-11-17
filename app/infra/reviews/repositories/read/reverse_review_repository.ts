import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as reverseReviewQueries from '../read/reverse_review_queries.js'

import type ReverseReview from '#infra/reviews/models/reverse_review'
import type { DatabaseId } from '#types/database'

export default class ReverseReviewRepository {
  private readonly __instanceMarker = true

  static {
    void new ReverseReviewRepository().__instanceMarker
  }

  static async findByUniqueScope(
    reviewSessionId: DatabaseId,
    reviewerId: DatabaseId,
    targetType: string,
    targetId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ReverseReview | null> {
    return reverseReviewQueries.findByUniqueScope(
      reviewSessionId,
      reviewerId,
      targetType,
      targetId,
      trx
    )
  }

}
