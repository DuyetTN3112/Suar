import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import {
  normalizePagination,
  fromLegacySnakePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type { CanonicalMetaLike } from '#modules/pagination/public_contracts/pagination_public_api'
import type { ReviewSessionReadStore } from '#modules/reviews/actions/ports/outbound/review_session_readers'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canAccessReviewSessionAsActor } from '#modules/reviews/domain/review_policy'
import { REVIEW_PAGINATION } from '#modules/reviews/public_contracts/review_pagination'
import type { ReviewEvidenceRecord } from '#modules/reviews/types/review_records'

export interface GetReviewEvidencesInput {
  page?: unknown
  perPage?: unknown
}

export interface GetReviewEvidencesResult {
  data: ReviewEvidenceRecord[]
  meta: CanonicalMetaLike
}

/**
 * Query: list evidences for a review session.
 */
export default class GetReviewEvidencesQuery {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly sessions: ReviewSessionReadStore
  ) {}

  async execute(
    reviewSessionId: string,
    input: GetReviewEvidencesInput = {}
  ): Promise<GetReviewEvidencesResult> {
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

    const pagination = normalizePagination(input, REVIEW_PAGINATION, { perPage: 10 })
    const result = await this.sessions.paginateEvidence(reviewSessionId, pagination)

    return {
      data: result.data,
      meta: fromLegacySnakePagination(result.meta),
    }
  }
}
