import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { ADMIN_PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import {
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { paginateFlaggedReviewsForAdmin } from '#modules/reviews/public_contracts/review_moderation'

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

export interface ListFlaggedReviewsResult {
  data: {
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
  }[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    cursor: {
      nextCursor: string | null
      previousCursor: string | null
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
  }
}

export default class ListFlaggedReviewsQuery extends BaseQuery<
  ListFlaggedReviewsDTO,
  ListFlaggedReviewsResult
> {
  constructor(execCtx: AdminActionContext) {
    super(execCtx)
  }

  async handle(dto: ListFlaggedReviewsDTO): Promise<ListFlaggedReviewsResult> {
    const pagination = normalizePagination(dto, ADMIN_PAGINATION, { perPage: 50 })

    const result = await paginateFlaggedReviewsForAdmin(
      dto.after || dto.before ? 1 : pagination.page,
      pagination.perPage,
      dto.status,
      dto.after ?? undefined,
      dto.before ?? undefined,
      {
        ...(dto.search ? { search: dto.search } : {}),
        ...(dto.flagType ? { flagType: dto.flagType } : {}),
        ...(dto.severity ? { severity: dto.severity } : {}),
      }
    )

    return {
      data: result.data.map((fr) => ({
        id: fr.id,
        reviewer: {
          id: fr.skill_review.reviewer.id,
          username: fr.skill_review.reviewer.username,
          email: fr.skill_review.reviewer.email ?? '',
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
        created_at: (fr.detected_at.toISO() ?? fr.created_at.toISO()) ?? new Date().toISOString(),
        reviewed_at: fr.reviewed_at?.toISO() ?? null,
      })),
      meta: {
        total: result.total,
        perPage: result.perPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        cursor: {
          nextCursor: result.nextCursor,
          previousCursor: result.previousCursor,
          hasNextPage: result.hasNextPage,
          hasPreviousPage: result.hasPreviousPage,
        },
      },
    }
  }
}
