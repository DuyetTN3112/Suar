import ReviewEvidenceRepository from '#infra/reviews/repositories/review_evidence_repository'
import type { DatabaseId } from '#types/database'
import type { ReviewEvidenceRecord } from '#types/review_records'

/**
 * Query: list evidences for a review session.
 */
export default class GetReviewEvidencesQuery {
  async execute(reviewSessionId: DatabaseId): Promise<ReviewEvidenceRecord[]> {
    return ReviewEvidenceRepository.listBySession(reviewSessionId)
  }
}
