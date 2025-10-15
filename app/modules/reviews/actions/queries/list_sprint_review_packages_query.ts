import db from '@adonisjs/lucid/services/db'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  buildPaginationMeta,
  normalizePagination,
  toOffset,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { REVIEW_PAGINATION } from '#modules/reviews/application/dtos/common/review_pagination'

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

export default class ListSprintReviewPackagesQuery {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async handle(input: { page?: unknown; perPage?: unknown } = {}): Promise<{
    data: SprintReviewPackageListRecord[]
    meta: ReturnType<typeof buildPaginationMeta>
  }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const pagination = normalizePagination(input, REVIEW_PAGINATION, { perPage: 10 })
    const query = db
      .from('sprint_review_packages as srp')
      .innerJoin('project_sprints as ps', 'ps.id', 'srp.sprint_id')
      .joinRaw('inner join projects as p on p.id::text = ps.project_id')
      .where('srp.reviewer_id', userId)
      .whereNull('p.deleted_at')
      .orderBy('ps.ends_at', 'desc')
      .orderBy('srp.updated_at', 'desc')
      .select(
        'srp.id',
        'srp.sprint_id',
        'srp.reviewer_id',
        'srp.status',
        'srp.submitted_at',
        'srp.created_at',
        'srp.updated_at',
        'ps.name as sprint_name',
        'ps.starts_at as sprint_starts_at',
        'ps.ends_at as sprint_ends_at',
        'p.id as project_id',
        'p.name as project_name',
        'ps.organization_id'
      )

    const totalRow = (await query.clone().clearSelect().clearOrder().count('* as total').first()) as
      | { total?: string | number }
      | undefined
    const total = Number(totalRow?.total ?? 0)
    const rows = (await query
      .offset(toOffset(pagination.page, pagination.perPage))
      .limit(pagination.perPage)) as SprintReviewPackageListRecord[]

    return {
      data: rows.map((row) => ({
        ...row,
        submitted_at: toIsoLike(row.submitted_at),
        created_at: toIsoLike(row.created_at) ?? '',
        updated_at: toIsoLike(row.updated_at) ?? '',
        sprint_starts_at: toIsoLike(row.sprint_starts_at) ?? '',
        sprint_ends_at: toIsoLike(row.sprint_ends_at) ?? '',
      })),
      meta: buildPaginationMeta(total, pagination),
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
