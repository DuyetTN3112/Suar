import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ReviewEvidence from '#models/review_evidence'
import type { DatabaseId } from '#types/database'

export default class ReviewEvidenceRepository {
  private readonly __instanceMarker = true

  static {
    void new ReviewEvidenceRepository().__instanceMarker
  }

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? ReviewEvidence.query({ client: trx }) : ReviewEvidence.query()
  }

  static async listBySession(
    reviewSessionId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ReviewEvidence[]> {
    return this.baseQuery(trx)
      .where('review_session_id', reviewSessionId)
      .orderBy('created_at', 'desc')
  }

  static async create(
    data: Partial<ReviewEvidence>,
    trx?: TransactionClientContract
  ): Promise<ReviewEvidence> {
    return ReviewEvidence.create(data, trx ? { client: trx } : undefined)
  }
}
