import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { loadReviewSessionActorAccessContext } from '#modules/reviews/actions/support/review_session_actor_access'
import { canAccessReviewSessionAsActor } from '#modules/reviews/domain/review_policy'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import TaskSelfAssessmentRepository from '#modules/reviews/infra/repositories/task_self_assessment_repository'
import type { TaskSelfAssessmentRecord } from '#modules/reviews/types/review_records'

/**
 * Query: get reviewee self-assessment by review session id.
 */
export default class GetTaskSelfAssessmentQuery {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(
    reviewSessionId: string
  ): Promise<TaskSelfAssessmentRecord | null> {
    if (!this.execCtx.userId) {
      throw new ForbiddenException('You do not have permission to access this review session')
    }

    const access = await loadReviewSessionActorAccessContext(reviewSessionId, this.execCtx.userId)
    const policy = canAccessReviewSessionAsActor({
      sessionExists: !!access,
      actorId: this.execCtx.userId,
      actorSystemRole: access?.actorSystemRole ?? null,
      sessionRevieweeId: access?.sessionRevieweeId ?? '',
      sessionTaskOrgId: access?.sessionTaskOrgId ?? '',
      managerReviewerIds: access?.managerReviewerIds ?? [],
      peerReviewerIds: access?.peerReviewerIds ?? [],
      isOrgAdminOrOwner: access?.isOrgAdminOrOwner ?? false,
    })

    if (!policy.allowed) {
      throw new ForbiddenException(policy.reason)
    }

    const session = await ReviewSessionRepository.findById(reviewSessionId)
    if (!session) return null

    return TaskSelfAssessmentRepository.findByTaskAssignmentAndUser(
      session.task_assignment_id,
      session.reviewee_id
    )
  }
}
