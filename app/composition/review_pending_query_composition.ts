import { ReviewProjectMembershipReaderAdapter } from './adapters/review_project_membership_reader_adapter.js'
import { TaskReviewAssignmentProjectionReaderAdapter } from './adapters/task_review_assignment_projection_reader_adapter.js'
import { UserReviewModeratorIdentityProjectionReaderAdapter } from './adapters/user_review_moderator_identity_projection_reader_adapter.js'

import GetPendingReviewsQuery from '#modules/reviews/actions/queries/get_pending_reviews_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { LucidReviewSessionReadStore } from '#modules/reviews/infra/adapters/lucid_review_session_readers'

const projectMembership = new ReviewProjectMembershipReaderAdapter()
const taskAssignment = new TaskReviewAssignmentProjectionReaderAdapter()
const moderatorIdentity = new UserReviewModeratorIdentityProjectionReaderAdapter()
const sessions = new LucidReviewSessionReadStore()

export function makeGetPendingReviewsQuery(
  execCtx: ReviewActionContext
): GetPendingReviewsQuery {
  return new GetPendingReviewsQuery(execCtx, {
    projectMembership,
    taskAssignment,
    moderatorIdentity,
    sessions,
  })
}
