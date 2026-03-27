import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { GetReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import { loadReviewSessionActorAccessContext } from '#modules/reviews/actions/support/review_session_actor_access'
import { canAccessReviewSessionAsActor } from '#modules/reviews/domain/review_policy'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import type { ReviewSessionRecord } from '#modules/reviews/types/review_records'

/**
 * GetReviewSessionQuery
 *
 * Fetches a review session with all related data.
 */
export default class GetReviewSessionQuery extends BaseQuery<
  GetReviewSessionDTO,
  ReviewSessionRecord
> {
  async handle(dto: GetReviewSessionDTO): Promise<ReviewSessionRecord> {
    const actorId = this.getCurrentUserId()
    if (!actorId) {
      throw new ForbiddenException('You do not have permission to access this review session')
    }

    const cacheKey = this.generateCacheKey('review:session', {
      sessionId: dto.review_session_id,
    })

    const session = await this.executeWithCache(cacheKey, 300, async () => {
      return ReviewSessionRepository.findByIdWithRelations(dto.review_session_id)
    })

    const access = await loadReviewSessionActorAccessContext(dto.review_session_id, actorId)
    const policy = canAccessReviewSessionAsActor({
      sessionExists: !!access,
      actorId,
      actorSystemRole: access?.actorSystemRole ?? null,
      sessionRevieweeId: access?.sessionRevieweeId ?? '',
      sessionTaskOrgId: access?.sessionTaskOrgId ?? '',
      managerReviewerIds: access?.managerReviewerIds ?? [],
      peerReviewerIds: access?.peerReviewerIds ?? [],
      isOrgAdminOrOwner: access?.isOrgAdminOrOwner ?? false,
    })

    if (!policy.allowed) {
      throw new ForbiddenException('You do not have permission to access this review session')
    }

    return session
  }
}
