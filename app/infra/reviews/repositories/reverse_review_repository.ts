import * as reverseReviewQueries from './read/reverse_review_queries.js'
import * as reverseReviewMutations from './write/reverse_review_mutations.js'

/**
 * ReverseReviewRepository - Barrel file
 * Maintains backward compatibility with existing imports.
 */
const ReverseReviewRepository = {
  ...reverseReviewQueries,
  ...reverseReviewMutations,
}

export default ReverseReviewRepository
export type { DatabaseId } from '#types/database'
