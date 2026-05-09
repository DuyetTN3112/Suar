import type { AdminActionContext } from '#modules/admin/reviews/actions/action_context'
import { ADMIN_PAGINATION } from '#modules/admin/reviews/actions/dtos/common/reviews/admin_pagination'
import type {
  ReviewModerationGateway,
  ReviewModerationListResult,
} from '#modules/admin/reviews/actions/ports/outbound/reviews/review_moderation_gateway'
import { BaseQuery } from '#modules/admin/reviews/actions/queries/reviews/base_query'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'

export interface ListFlaggedReviewsDTO {
  page?: number
  perPage?: number
  after?: string | null
  before?: string | null
  search?: string
  flagType?: string
  severity?: string
  status?: string
}

export type ListFlaggedReviewsResult = ReviewModerationListResult

export default class ListFlaggedReviewsQuery extends BaseQuery<
  ListFlaggedReviewsDTO,
  ListFlaggedReviewsResult
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly moderationGateway: ReviewModerationGateway
  ) {
    super(execCtx)
  }

  async handle(dto: ListFlaggedReviewsDTO): Promise<ListFlaggedReviewsResult> {
    const pagination = normalizePagination(dto, ADMIN_PAGINATION, { perPage: 50 })

    return this.moderationGateway.list({
      page: pagination.page,
      perPage: pagination.perPage,
      ...(dto.after ? { after: dto.after } : {}),
      ...(dto.before ? { before: dto.before } : {}),
      ...(dto.search ? { search: dto.search } : {}),
      ...(dto.flagType ? { flagType: dto.flagType } : {}),
      ...(dto.severity ? { severity: dto.severity } : {}),
      ...(dto.status ? { status: dto.status } : {}),
    })
  }
}
