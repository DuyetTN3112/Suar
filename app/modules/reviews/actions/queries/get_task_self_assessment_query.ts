import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import type { ReviewSessionReadStore } from '#modules/reviews/actions/ports/outbound/review_session_readers'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canAccessReviewSessionAsActor } from '#modules/reviews/domain/review_policy'
import type { TaskSelfAssessmentRecord } from '#modules/reviews/types/review_records'

/**
 * Query: get reviewee self-assessment by review session id.
 */
export default class GetTaskSelfAssessmentQuery {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly sessions: ReviewSessionReadStore
  ) {}

  async execute(reviewSessionId: string): Promise<TaskSelfAssessmentRecord | null> {
    if (!this.execCtx.userId) {
      throw new ForbiddenException('You do not have permission to access this review session')
    }

    const access = await this.sessions.loadActorAccess(reviewSessionId, this.execCtx.userId)
    const policy = canAccessReviewSessionAsActor({
      sessionExists: !!access,
      actorId: this.execCtx.userId,
      sessionRevieweeId: access?.sessionRevieweeId ?? '',
      managerReviewerIds: access?.managerReviewerIds ?? [],
      peerReviewerIds: access?.peerReviewerIds ?? [],
      isOrgAdminOrOwner: access?.isOrgAdminOrOwner ?? false,
    })

    if (!policy.allowed) {
      throw new ForbiddenException(policy.reason)
    }

    const session = await this.sessions.findIdentity(reviewSessionId)
    if (!session) return null

    return this.sessions.findSelfAssessment(session.taskAssignmentId, session.revieweeId)
  }
}
