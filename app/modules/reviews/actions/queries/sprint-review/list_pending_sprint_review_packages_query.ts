import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { ReviewSprintPackageReader } from '#modules/reviews/actions/ports/outbound/review_sprint_package_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { REVIEW_PAGINATION } from '#modules/reviews/public_contracts/review_pagination'

export interface PendingSprintReviewPackageRecord {
  id: string
  sprint_id: string
  reviewer_id: string
  status: string
  created_at: string
  updated_at: string
  sprint_name: string
  sprint_starts_at: string
  sprint_ends_at: string
  project_id: string
  project_name: string
  organization_id: string
}

type SprintReviewPackageListInput = { page?: unknown; perPage?: unknown }

type SprintReviewPackageListOutput = {
  data: PendingSprintReviewPackageRecord[]
  meta: ReturnType<typeof buildPaginationMeta>
}

export default class ListPendingSprintReviewPackagesQuery extends BaseQuery<
  SprintReviewPackageListInput,
  SprintReviewPackageListOutput
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly packages: ReviewSprintPackageReader
  ) {
    super(execCtx)
  }

  async handle(input: SprintReviewPackageListInput = {}): Promise<SprintReviewPackageListOutput> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const pagination = normalizePagination(input, REVIEW_PAGINATION, { perPage: 10 })
    const page = await this.packages.listPendingForReviewer(userId, pagination)
    const data = page.rows.map((row) => ({
      id: row.id,
      sprint_id: row.sprint_id,
      reviewer_id: row.reviewer_id,
      status: row.status,
      created_at: toIsoLike(row.created_at),
      updated_at: toIsoLike(row.updated_at),
      sprint_name: row.sprint_name,
      sprint_starts_at: toIsoLike(row.sprint_starts_at),
      sprint_ends_at: toIsoLike(row.sprint_ends_at),
      project_id: row.project_id,
      project_name: row.project_name,
      organization_id: row.organization_id,
    }))

    return {
      data,
      meta: buildPaginationMeta(page.total, pagination),
    }
  }
}

function toIsoLike(value: string | Date): string {
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
  }
  return value.toISOString()
}
