import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { GetUserReviewsDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
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

interface UserReviewsResult {
  data: ReviewSessionProjection[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

/**
 * GetUserReviewsQuery
 *
 * Fetches all review sessions for a user (as reviewee).
 */
export default class GetUserReviewsQuery extends BaseQuery<GetUserReviewsDTO, UserReviewsResult> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly assignmentProjectionReader: ReviewAssignmentProjectionReader,
    private readonly moderatorIdentityReader: ReviewModeratorIdentityProjectionReader,
    private readonly skillIdentityReader: ReviewSkillIdentityReader,
    private readonly sessions: ReviewSessionReadStore
  ) {
    super(execCtx)
  }

  async handle(dto: GetUserReviewsDTO): Promise<UserReviewsResult> {
    const result = await this.sessions.paginateByReviewee(
      dto.user_id,
      dto.page,
      dto.per_page
    )

    const sessions = result.data
    const projectionOptions = {
      includeReviewerIdentity: false,
      assignmentProjection: 'summary' as const,
    }
    const { skillIds, identityIds, assignmentIds } = collectReviewSessionProjectionIds(
      sessions,
      projectionOptions
    )
    const [skills, identities, assignments] = await Promise.all([
      this.skillIdentityReader.findSkillsByIds(skillIds),
      identityIds.length > 0 ? this.moderatorIdentityReader.findByIds(identityIds) : [],
      assignmentIds.length > 0
        ? this.assignmentProjectionReader.findReviewAssignmentContextsV1(assignmentIds)
        : [],
    ])
    const data = assembleReviewSessionProjections(
      sessions,
      { skills, identities, assignments },
      projectionOptions
    )

    return {
      data,
      meta: {
        total: result.total,
        per_page: result.perPage,
        current_page: result.currentPage,
        last_page: result.lastPage,
      },
    }
  }
}
