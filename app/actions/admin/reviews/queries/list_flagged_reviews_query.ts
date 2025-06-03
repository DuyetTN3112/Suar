import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import AdminFlaggedReviewRepository from '#infra/admin/repositories/admin_flagged_review_repository'

export interface ListFlaggedReviewsDTO {
  page?: number
  perPage?: number
  search?: string
  flagType?: string
  severity?: string
  status?: string
}

export interface ListFlaggedReviewsResult {
  data: Array<{
    id: string
    reviewer: { id: string; username: string; email: string } | null
    reviewee: { id: string; username: string } | null
    reviewed_by: { id: string; username: string } | null
    comment: string | null
    flag_type: string
    severity: string
    status: string
    notes: string | null
    created_at: string
    reviewed_at: string | null
  }>
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export default class ListFlaggedReviewsQuery extends BaseQuery<
  ListFlaggedReviewsDTO,
  ListFlaggedReviewsResult
> {
  constructor(
    execCtx: ExecutionContext,
    private repo = new AdminFlaggedReviewRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: ListFlaggedReviewsDTO): Promise<ListFlaggedReviewsResult> {
    const page = dto.page || 1
    const perPage = dto.perPage || 50

    const result = await this.repo.listFlaggedReviews(
      { search: dto.search, flagType: dto.flagType, severity: dto.severity, status: dto.status },
      page,
      perPage
    )

    const lastPage = Math.max(1, Math.ceil(result.total / perPage))

    return {
      data: result.flaggedReviews.map((fr) => ({
        id: fr.id,
        reviewer: {
          id: fr.skill_review.reviewer.id,
          username: fr.skill_review.reviewer.username,
          email: fr.skill_review.reviewer.email || '',
        },
        reviewee: {
          id: fr.skill_review.review_session.reviewee.id,
          username: fr.skill_review.review_session.reviewee.username,
        },
        reviewed_by: fr.reviewed_by
          ? {
              id: fr.reviewer.id,
              username: fr.reviewer.username,
            }
          : null,
        comment: fr.skill_review.comment ?? null,
        flag_type: fr.flag_type,
        severity: fr.severity,
        status: fr.status,
        notes: fr.notes,
        created_at: fr.detected_at.toISO() || fr.created_at.toISO() || new Date().toISOString(),
        reviewed_at: fr.reviewed_at?.toISO() ?? null,
      })),
      meta: { total: result.total, perPage, currentPage: page, lastPage },
    }
  }
}
