import type AppException from '#modules/errors/public_contracts/application_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { ReviewSessionReadStore } from '#modules/reviews/actions/ports/outbound/review_session_readers'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canAccessReviewSessionAsActor } from '#modules/reviews/domain/review-core/review_policy'
import type { TaskSelfAssessmentRecord } from '#modules/reviews/types/review_records'

export interface GetTaskSelfAssessmentInput {
  reviewSessionId: string
}

/**
 * Query: get reviewee self-assessment by review session id.
 */
export default class GetTaskSelfAssessmentQuery extends BaseQuery<
  GetTaskSelfAssessmentInput,
  TaskSelfAssessmentRecord | null
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly sessions: ReviewSessionReadStore
  ) {
    super(execCtx)
  }

  override executeAndWrap(
    input: GetTaskSelfAssessmentInput
  ): Promise<Result<TaskSelfAssessmentRecord | null, AppException>>
  override executeAndWrap(
    reviewSessionId: string
  ): Promise<Result<TaskSelfAssessmentRecord | null, AppException>>
  override executeAndWrap(
    inputOrReviewSessionId: GetTaskSelfAssessmentInput | string
  ): Promise<Result<TaskSelfAssessmentRecord | null, AppException>> {
    const input =
      typeof inputOrReviewSessionId === 'string'
        ? { reviewSessionId: inputOrReviewSessionId }
        : inputOrReviewSessionId
    return super.executeAndWrap(input)
  }

  async execute(reviewSessionId: string): Promise<TaskSelfAssessmentRecord | null> {
    return this.handle({ reviewSessionId })
  }

  async handle(input: GetTaskSelfAssessmentInput): Promise<TaskSelfAssessmentRecord | null> {
    if (!this.execCtx.userId) {
      throw new ForbiddenException('You do not have permission to access this review session')
    }

    const access = await this.sessions.loadActorAccess(input.reviewSessionId, this.execCtx.userId)
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

    const session = await this.sessions.findIdentity(input.reviewSessionId)
    if (!session) return null

    return this.sessions.findSelfAssessment(session.taskAssignmentId, session.revieweeId)
  }
}
