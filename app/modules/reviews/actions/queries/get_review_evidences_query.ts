import ReviewEvidenceRepository from '#modules/reviews/infra/repositories/review_evidence_repository'
import type { ReviewEvidenceRecord } from '#modules/reviews/types/review_records'

/**
 * Query: list evidences for a review session.
 */
export default class GetReviewEvidencesQuery {
  async execute(reviewSessionId: string): Promise<ReviewEvidenceRecord[]> {
    return ReviewEvidenceRepository.listBySession(reviewSessionId)
  }
}
