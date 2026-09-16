import * as flaggedReviewQueries from './flagged_review_queries.js'
import * as flaggedReviewMutations from './flagged_review_mutations.js'

/**
 * FlaggedReviewRepository - Barrel for moderation queries & mutations
 */
const FlaggedReviewRepository = {
  ...flaggedReviewQueries,
  ...flaggedReviewMutations,
}

export default FlaggedReviewRepository
