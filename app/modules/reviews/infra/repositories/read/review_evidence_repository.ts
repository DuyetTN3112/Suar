import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as reviewEvidenceQueries from '../read/review_evidence_queries.js'

import type ReviewEvidence from '#modules/reviews/infra/models/review_evidence'

export default class ReviewEvidenceRepository {
  private readonly __instanceMarker = true

  static {
    void new ReviewEvidenceRepository().__instanceMarker
  }

  static async listBySession(
    reviewSessionId: string,
    trx?: TransactionClientContract
  ): Promise<ReviewEvidence[]> {
    return reviewEvidenceQueries.listBySession(reviewSessionId, trx)
  }

}
