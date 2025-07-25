import * as flaggedReviewQueries from './read/flagged_review_queries.js'
import * as flaggedReviewMutations from './write/flagged_review_mutations.js'

/**
 * FlaggedReviewRepository - Barrel file
 * Maintains backward compatibility with existing imports.
 */
const FlaggedReviewRepository = {
  ...flaggedReviewQueries,
  ...flaggedReviewMutations,
}

export default FlaggedReviewRepository
export type { DatabaseId } from '#types/database'
