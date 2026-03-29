import ReviewEvidenceRepository from '#infra/reviews/repositories/review_evidence_repository'
import type { DatabaseId } from '#types/database'

/**
 * Query: list evidences for a review session.
 */
export default class GetReviewEvidencesQuery {
  async execute(reviewSessionId: DatabaseId): Promise<import('#models/review_evidence').default[]> {
    return ReviewEvidenceRepository.listBySession(reviewSessionId)
  }
}
