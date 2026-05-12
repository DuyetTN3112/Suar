import * as reviewEvidenceQueries from './read/review_evidence_queries.js'
import * as reviewEvidenceMutations from './write/review_evidence_mutations.js'

/**
 * ReviewEvidenceRepository - Barrel file
 * Maintains backward compatibility with existing imports.
 */
const ReviewEvidenceRepository = {
  ...reviewEvidenceQueries,
  ...reviewEvidenceMutations,
}

export default ReviewEvidenceRepository
export type { DatabaseId } from '#types/database'
