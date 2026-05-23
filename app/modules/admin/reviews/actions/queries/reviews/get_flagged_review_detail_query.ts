import type { AdminActionContext } from '#modules/admin/reviews/actions/action_context'
import type {
  ReviewModerationDetail,
  ReviewModerationGateway,
} from '#modules/admin/reviews/actions/ports/outbound/reviews/review_moderation_gateway'
import { BaseQuery } from '#modules/admin/reviews/actions/queries/reviews/base_query'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'

export interface GetFlaggedReviewDetailDTO {
  id: string
}

export type GetFlaggedReviewDetailResult = ReviewModerationDetail

export default class GetFlaggedReviewDetailQuery extends BaseQuery<
  GetFlaggedReviewDetailDTO,
  GetFlaggedReviewDetailResult
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly moderationGateway: ReviewModerationGateway
  ) {
    super(execCtx)
  }

  async handle(dto: GetFlaggedReviewDetailDTO): Promise<GetFlaggedReviewDetailResult> {
    const result = await this.moderationGateway.getDetail(dto.id)
    if (!result) {
      throw NotFoundException.resource('Flagged review', dto.id)
    }

    return result
  }
}
