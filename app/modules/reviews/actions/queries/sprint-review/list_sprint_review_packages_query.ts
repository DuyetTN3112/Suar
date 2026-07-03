import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { ReviewSprintPackageReader } from '#modules/reviews/actions/ports/outbound/review_sprint_package_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { REVIEW_PAGINATION } from '#modules/reviews/public_contracts/review_pagination'

export interface SprintReviewPackageListRecord {
  id: string
  sprint_id: string
  reviewer_id: string
  status: string
  submitted_at: string | null
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
  data: SprintReviewPackageListRecord[]
  meta: ReturnType<typeof buildPaginationMeta>
}

export default class ListSprintReviewPackagesQuery extends BaseQuery<
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
    const page = await this.packages.listForReviewer(userId, pagination)

    return {
      data: page.rows.map((row) => ({
        ...row,
        submitted_at: toIsoLike(row.submitted_at),
        created_at: toIsoLike(row.created_at) ?? '',
        updated_at: toIsoLike(row.updated_at) ?? '',
        sprint_starts_at: toIsoLike(row.sprint_starts_at) ?? '',
        sprint_ends_at: toIsoLike(row.sprint_ends_at) ?? '',
      })),
      meta: buildPaginationMeta(page.total, pagination),
    }
  }
}

function toIsoLike(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
  }
  if (value instanceof Date) return value.toISOString()
  return null
}
