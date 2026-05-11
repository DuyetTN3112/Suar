import { ReviewProjectMembershipReaderAdapter } from '#composition/adapters/reviews/review_project_membership_reader_adapter'
import { TaskReviewAssignmentProjectionReaderAdapter } from '#composition/adapters/tasks/task_review_assignment_projection_reader_adapter'
import { UserReviewModeratorIdentityProjectionReaderAdapter } from '#composition/adapters/users/user_review_moderator_identity_projection_reader_adapter'

import GetPendingReviewsQuery from '#modules/reviews/actions/queries/review-submission/get_pending_reviews_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { LucidReviewSessionReadStore } from '#modules/reviews/infra/adapters/review-session/lucid_review_session_readers'

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
