import { reviewSessionCacheKey } from '#modules/cache/public_contracts/cache_contract'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { GetReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReviewSessionProjection } from '#modules/reviews/actions/dtos/response/review_session_projection'
import {
  assembleReviewSessionProjections,
  collectReviewSessionProjectionIds,
} from '#modules/reviews/actions/mappers/review_session_projection_mapper'
import type {
  ReviewAssignmentProjectionReader,
  ReviewModeratorIdentityProjectionReader,
  ReviewSkillIdentityReader,
} from '#modules/reviews/actions/ports/outbound/review_projection_enrichment_readers'
import type { ReviewSessionReadStore } from '#modules/reviews/actions/ports/outbound/review_session_readers'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canAccessReviewSessionAsActor } from '#modules/reviews/domain/review_policy'

/**
 * GetReviewSessionQuery
 *
 * Fetches a review session with all related data.
 */
export default class GetReviewSessionQuery extends BaseQuery<
  GetReviewSessionDTO,
  ReviewSessionProjection
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly assignmentProjectionReader: ReviewAssignmentProjectionReader,
    private readonly moderatorIdentityReader: ReviewModeratorIdentityProjectionReader,
    private readonly skillIdentityReader: ReviewSkillIdentityReader,
    private readonly sessions: ReviewSessionReadStore
  ) {
    super(execCtx)
  }

  async handle(dto: GetReviewSessionDTO): Promise<ReviewSessionProjection> {
    const actorId = this.getCurrentUserId()
    if (!actorId) {
      throw new ForbiddenException('You do not have permission to access this review session')
    }

    const access = await this.sessions.loadActorAccess(dto.review_session_id, actorId)
    const policy = canAccessReviewSessionAsActor({
      sessionExists: !!access,
      actorId,
      sessionRevieweeId: access?.sessionRevieweeId ?? '',
      managerReviewerIds: access?.managerReviewerIds ?? [],
      peerReviewerIds: access?.peerReviewerIds ?? [],
      isOrgAdminOrOwner: access?.isOrgAdminOrOwner ?? false,
    })

    if (!policy.allowed) {
      throw new ForbiddenException('You do not have permission to access this review session')
    }

    const cacheKey = reviewSessionCacheKey(dto.review_session_id)

    return this.executeWithCache(cacheKey, 300, async () => {
      const session = await this.sessions.findProjectionSource(dto.review_session_id)
      const projectionOptions = {
        includeReviewerIdentity: true,
        includeRevieweeIdentity: true,
        assignmentProjection: 'detail' as const,
      }
      const { skillIds, identityIds, assignmentIds } = collectReviewSessionProjectionIds(
        [session],
        projectionOptions
      )
      const [skills, identities, assignments] = await Promise.all([
        this.skillIdentityReader.findSkillsByIds(skillIds),
        this.moderatorIdentityReader.findByIds(identityIds),
        this.assignmentProjectionReader.findReviewAssignmentContextsV1(assignmentIds),
      ])
      const [projection] = assembleReviewSessionProjections(
        [session],
        { skills, identities, assignments },
        projectionOptions
      )
      if (!projection) {
        throw new InvariantViolationException(
          `Review session ${dto.review_session_id} projection could not be assembled`
        )
      }
      return projection
    })
  }
}
