import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as reverseReviewQueries from '../read/reverse_review_queries.js'

import type ReverseReview from '#modules/reviews/infra/models/reverse_review'

export default class ReverseReviewRepository {
  private readonly __instanceMarker = true

  static {
    void new ReverseReviewRepository().__instanceMarker
  }

  static async findByUniqueScope(
    reviewSessionId: string,
    reviewerId: string,
    targetType: string,
    targetId: string,
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
