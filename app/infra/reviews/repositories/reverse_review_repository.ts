import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import ReverseReview from '#models/reverse_review'

export default class ReverseReviewRepository {
  private readonly __instanceMarker = true

  static {
    void new ReverseReviewRepository().__instanceMarker
  }

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? ReverseReview.query({ client: trx }) : ReverseReview.query()
  }

  static async findByUniqueScope(
    reviewSessionId: DatabaseId,
    reviewerId: DatabaseId,
    targetType: string,
    targetId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ReverseReview | null> {
    return this.baseQuery(trx)
      .where('review_session_id', reviewSessionId)
      .where('reviewer_id', reviewerId)
      .where('target_type', targetType)
      .where('target_id', targetId)
      .first()
  }

  static async create(
    data: Partial<ReverseReview>,
    trx?: TransactionClientContract
  ): Promise<ReverseReview> {
    return ReverseReview.create(data, trx ? { client: trx } : undefined)
  }
}
