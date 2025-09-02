import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { loadReviewSessionActorAccessContext } from '#modules/reviews/actions/support/review_session_actor_access'
import { canAccessReviewSessionAsActor } from '#modules/reviews/domain/review_policy'
import ReviewEvidenceRepository from '#modules/reviews/infra/repositories/review_evidence_repository'
import type { ReviewEvidenceRecord } from '#modules/reviews/types/review_records'

/**
 * Query: list evidences for a review session.
 */
export default class GetReviewEvidencesQuery {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(reviewSessionId: string): Promise<ReviewEvidenceRecord[]> {
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

    return ReviewEvidenceRepository.listBySession(reviewSessionId)
  }
}
