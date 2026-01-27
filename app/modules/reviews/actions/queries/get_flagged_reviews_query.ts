import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { LegacyFlaggedReviewPageProjection } from '#modules/reviews/actions/dtos/response/flagged_review_moderation_projection'
import {
  assembleFlaggedReviewModerationProjections,
  collectFlaggedReviewModerationProjectionIds,
  toLegacyFlaggedReviewPageProjection,
} from '#modules/reviews/actions/mappers/flagged_review_moderation_projection_mapper'
import type {
  ReviewAssignmentProjectionReader,
  ReviewModeratorIdentityProjectionReader,
  ReviewSkillIdentityReader,
} from '#modules/reviews/actions/ports/outbound/review_projection_enrichment_readers'
import type { ReviewFlaggedReviewReader } from '#modules/reviews/actions/ports/outbound/review_session_readers'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

interface GetFlaggedReviewsDTO {
  page: number
  per_page: number
  after?: string
  before?: string
  status?: string
}

interface GetFlaggedReviewsResult {
  data: LegacyFlaggedReviewPageProjection[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    cursor: {
      next_cursor: string | null
      previous_cursor: string | null
      has_next_page: boolean
      has_previous_page: boolean
    }
  }
}

/**
 * GetFlaggedReviewsQuery
 *
 * Fetches flagged reviews for admin review panel.
 * Can filter by status (pending, reviewed, dismissed, confirmed).
 */
export default class GetFlaggedReviewsQuery extends BaseQuery<
  GetFlaggedReviewsDTO,
  GetFlaggedReviewsResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly assignmentProjectionReader: ReviewAssignmentProjectionReader,
    private readonly moderatorIdentityReader: ReviewModeratorIdentityProjectionReader,
    private readonly skillIdentityReader: ReviewSkillIdentityReader,
    private readonly flaggedReviews: ReviewFlaggedReviewReader
  ) {
    super(execCtx)
  }

  async handle(dto: GetFlaggedReviewsDTO): Promise<GetFlaggedReviewsResult> {
    const paginated = await this.flaggedReviews.paginate(
      dto.page,
      dto.per_page,
      dto.status,
      dto.after,
      dto.before
    )
    const { identityIds, skillIds, assignmentIds } =
      collectFlaggedReviewModerationProjectionIds(paginated.data)
    const [identities, skills, assignments] = await Promise.all([
      this.moderatorIdentityReader.findByIds(identityIds),
      this.skillIdentityReader.findSkillsByIds(skillIds),
      this.assignmentProjectionReader.findReviewAssignmentContextsV1(assignmentIds),
    ])
    const projections = assembleFlaggedReviewModerationProjections(paginated.data, {
      identities,
      skills,
      assignments,
    })

    return {
      data: projections.map(toLegacyFlaggedReviewPageProjection),
      meta: {
        total: paginated.total,
        per_page: paginated.perPage,
        current_page: paginated.currentPage,
        last_page: paginated.lastPage,
        cursor: {
          next_cursor: paginated.nextCursor,
          previous_cursor: paginated.previousCursor,
          has_next_page: paginated.hasNextPage,
          has_previous_page: paginated.hasPreviousPage,
        },
      },
    }
  }
}
