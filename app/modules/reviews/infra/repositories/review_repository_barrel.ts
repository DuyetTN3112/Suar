import * as flaggedReviewQueries from './read/flagged_review_queries.js'
import * as reverseReviewQueries from './read/reverse_review_queries.js'
import * as reviewEvidenceQueries from './read/review_evidence_queries.js'
import * as reviewSessionQueries from './read/review_session_queries.js'
import * as taskSelfAssessmentQueries from './read/task_self_assessment_queries.js'
import * as flaggedReviewMutations from './write/flagged_review_mutations.js'
import * as reverseReviewMutations from './write/reverse_review_mutations.js'
import * as reviewEvidenceMutations from './write/review_evidence_mutations.js'
import * as reviewSessionMutations from './write/review_session_mutations.js'
import * as taskSelfAssessmentMutations from './write/task_self_assessment_mutations.js'

/**
 * ReviewRepository - Barrel file for all review-related repositories
 */
const ReviewRepository = {
  ...flaggedReviewQueries,
  ...flaggedReviewMutations,
  ...reverseReviewQueries,
  ...reverseReviewMutations,
  ...reviewEvidenceQueries,
  ...reviewEvidenceMutations,
  ...reviewSessionQueries,
  ...reviewSessionMutations,
  ...taskSelfAssessmentQueries,
  ...taskSelfAssessmentMutations,
}

export default ReviewRepository

// Re-export types
export type { DatabaseId } from '#types/database'
